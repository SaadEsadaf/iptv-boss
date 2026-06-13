const express = require('express')
const router = express.Router()
const { verifySignature } = require('../services/internalAuth')

// Health check — no auth required (used by EngineWatcher)
router.get('/health', (req, res) => {
  const start = Date.now();
  try {
    const { getDb } = require('../db');
    const db = getDb();
    const checks = {};

    try {
      const c = db.prepare("SELECT COUNT(*) as c FROM sqlite_master WHERE type='table'").get().c;
      checks.db = { status: 'ok', tables: c };
    } catch (e) { checks.db = { status: 'error', error: e.message }; }

    const criticalTables = ['providers_catalog', 'provider_plans', 'orders', 'activation_codes', 'websites'];
    const tables = {};
    for (const t of criticalTables) {
      try { const r = db.prepare(`SELECT COUNT(*) as c FROM ${t}`).get().c; tables[t] = { ok: true, rows: r }; }
      catch { tables[t] = { ok: false }; }
    }
    checks.tables = tables;

    try {
      const last24h = db.prepare("SELECT COUNT(*) as c FROM orders WHERE created_at > datetime('now', '-1 day')").get().c;
      const lastHour = db.prepare("SELECT COUNT(*) as c FROM orders WHERE created_at > datetime('now', '-1 hour')").get().c;
      checks.orders = { last_24h: last24h, last_hour: lastHour };
    } catch (e) { checks.orders = { error: e.message }; }

    try {
      const keys = db.prepare("SELECT value FROM app_settings WHERE key LIKE 'ai_key_%'").all();
      checks.ai_providers = { configured: keys.filter(k => k.value && k.value !== 'your_key_here').length };
    } catch (e) { checks.ai_providers = { error: e.message }; }

    res.json({
      engine: 'business',
      status: checks.db.status === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      response_time_ms: Date.now() - start,
      checks,
    });
  } catch (e) {
    res.status(500).json({ engine: 'business', status: 'error', error: e.message });
  }
});

// All internal routes require signature verification
router.use(express.json())
router.use(verifySignature)

// GET /api/internal/plans — return active plans (optionally filtered by website_id)
router.get('/plans', (req, res) => {
  const { getDb } = require('../db')
  const db = getDb()
  const websiteId = req.query.website_id || null
  const plans = websiteId
    ? db.prepare(`
        SELECT pp.*, pc.name as provider_name, pc.specialty, pc.logo_url
        FROM provider_plans pp
        JOIN providers_catalog pc ON pp.provider_id = pc.id
        WHERE pp.active = 1 AND pc.active = 1 AND pp.website_id = ? AND pc.website_id = ?
        ORDER BY pc.name, pp.price_sell
      `).all(websiteId, websiteId)
    : db.prepare(`
        SELECT pp.*, pc.name as provider_name, pc.specialty, pc.logo_url
        FROM provider_plans pp
        JOIN providers_catalog pc ON pp.provider_id = pc.id
        WHERE pp.active = 1 AND pc.active = 1
        ORDER BY pc.name, pp.price_sell
      `).all()
  res.json(plans)
})

// GET /api/internal/plan/:id — return single plan
router.get('/plan/:id', (req, res) => {
  const { getDb } = require('../db')
  const db = getDb()
  const plan = db.prepare(`
    SELECT pp.*, pc.name as provider_name, pc.specialty, pc.logo_url
    FROM provider_plans pp
    JOIN providers_catalog pc ON pp.provider_id = pc.id
    WHERE pp.id = ? AND pp.active = 1
  `).get(req.params.id)
  if (!plan) return res.status(404).json({ error: 'Plan not found' })
  res.json(plan)
})

// POST /api/internal/fulfill — receive payment confirmation, fulfill order
router.post('/fulfill', (req, res) => {
  try {
    const { order_id, customer_email, customer_name, customer_phone, provider_id, plan_id, method, payment_id, amount, currency, website_id } = req.body

    if (!order_id || !provider_id || !plan_id) {
      return res.status(400).json({ error: 'order_id, provider_id, plan_id required' })
    }

    const { getDb } = require('../db')
    const db = getDb()
    const emailService = require('../services/emailService')
    const { assignCode } = require('../services/codeAssigner')

    // Create order record in business DB
    const paymentIdField = method === 'stripe' ? 'stripe_payment_id' :
                           method === 'paypal' ? 'paypal_payment_id' :
                           method === 'sellup' ? 'sellup_order_id' : 'payment_id'

    const result = db.prepare(`
      INSERT INTO orders (customer_email, customer_name, customer_phone, provider_id, plan_id, amount, currency, status, source, ${paymentIdField}, payment_confirmed_at, website_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, datetime('now'), ?, datetime('now'))
    `).run(
      customer_email || null, customer_name || null, customer_phone || null,
      provider_id, plan_id, amount || 0, currency || 'EUR',
      'payment_engine', payment_id || '', website_id || 1
    )
    const businessOrderId = result.lastInsertRowid

    // Assign activation code
    const credentials = assignCode(businessOrderId, provider_id, plan_id)
    if (credentials) {
      const codeRow = db.prepare('SELECT id FROM activation_codes WHERE used_by_order_id = ?').get(businessOrderId)
      if (codeRow) {
        db.prepare('UPDATE orders SET activation_code_id = ? WHERE id = ?').run(codeRow.id, businessOrderId)
      }
    }

    // Send thank-you email immediately
    emailService.sendThankYou({ email: customer_email, name: customer_name }).catch(() => {})

    // Send credentials after 3-minute delay
    if (credentials) {
      setTimeout(async () => {
        try {
          await emailService.sendCredentials({ email: customer_email, name: customer_name, credentials })
          db.prepare("UPDATE orders SET credentials_sent_at = datetime('now') WHERE id = ?").run(businessOrderId)
        } catch (e) {
          console.error('[Internal] Delayed credentials error:', e.message)
        }
      }, 3 * 60 * 1000)
    }

    // Log fulfillment
    db.prepare('INSERT INTO agent_log (agent, action, details, order_id) VALUES (?, ?, ?, ?)').run(
      'PaymentEngine', 'fulfill',
      `${method} payment ${payment_id} fulfilled order #${order_id} → business order #${businessOrderId}`,
      businessOrderId
    )

    // Update chat sessions if session_id provided
    if (req.body.session_id) {
      db.prepare('UPDATE chat_sessions SET converted = 1 WHERE id = ?').run(req.body.session_id)
    }

    res.json({
      success: true,
      business_order_id: businessOrderId,
      activation_code_id: credentials ? db.prepare('SELECT id FROM activation_codes WHERE used_by_order_id = ?').get(businessOrderId)?.id : null,
      credentials_sent: !!credentials,
    })
  } catch (err) {
    console.error('[Internal] Fulfill error:', err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/internal/verify-credits — verify user has enough credits
router.post('/verify-credits', (req, res) => {
  res.json({ supported: false, error: 'Credits managed by Payment Engine' })
})

module.exports = router
