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

// GET /api/internal/stock-overview — full stock + orders overview for Marketing Engine
router.get('/stock-overview', (req, res) => {
  try {
    const { getDb } = require('../db')
    const db = getDb()
    const websiteId = req.query.website_id || null

    const wc = websiteId ? 'WHERE website_id = ?' : ''
    const wcp = websiteId ? [websiteId] : []

    // Activation codes
    const activationTotal = db.prepare(`SELECT COUNT(*) as c FROM activation_codes ${wc.replace('website_id', 'a.website_id') || ''}`).get(...(wc ? wcp : []))
    const activationAvailable = db.prepare(`SELECT COUNT(*) as c FROM activation_codes WHERE status = 'available' ${websiteId ? 'AND website_id = ?' : ''}`).get(...(websiteId ? [websiteId] : []))
    const activationUsed = db.prepare(`SELECT COUNT(*) as c FROM activation_codes WHERE status = 'used' ${websiteId ? 'AND website_id = ?' : ''}`).get(...(websiteId ? [websiteId] : []))
    const activationExpired = db.prepare(`SELECT COUNT(*) as c FROM activation_codes WHERE status = 'expired' ${websiteId ? 'AND website_id = ?' : ''}`).get(...(websiteId ? [websiteId] : []))
    const activationByProvider = db.prepare(`
      SELECT pc.name as provider, COUNT(*) as total,
        SUM(CASE WHEN ac.status='available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN ac.status='used' THEN 1 ELSE 0 END) as used
      FROM activation_codes ac JOIN providers_catalog pc ON ac.provider_id = pc.id
      ${websiteId ? 'WHERE pc.website_id = ?' : ''}
      GROUP BY pc.name ORDER BY available DESC
    `).all(...(websiteId ? [websiteId] : []))
    const activationByPlan = db.prepare(`
      SELECT pp.plan_name, pp.duration_months, COUNT(*) as total,
        SUM(CASE WHEN ac.status='available' THEN 1 ELSE 0 END) as available
      FROM activation_codes ac JOIN provider_plans pp ON ac.plan_id = pp.id
      ${websiteId ? 'WHERE pp.website_id = ?' : ''}
      GROUP BY pp.plan_name, pp.duration_months ORDER BY pp.duration_months
    `).all(...(websiteId ? [websiteId] : []))

    // Trial codes
    const trialTotal = db.prepare(`SELECT COUNT(*) as c FROM trial_codes`).get()
    const trialAvailable = db.prepare(`SELECT COUNT(*) as c FROM trial_codes WHERE status = 'available'`).get()
    const trialUsed = db.prepare(`SELECT COUNT(*) as c FROM trial_codes WHERE status = 'used'`).get()
    const trialByProvider = db.prepare(`
      SELECT pc.name as provider, COUNT(*) as total,
        SUM(CASE WHEN tc.status='available' THEN 1 ELSE 0 END) as available
      FROM trial_codes tc JOIN providers_catalog pc ON tc.provider_id = pc.id
      GROUP BY pc.name ORDER BY available DESC
    `).all()

    // Orders
    const ordersTotal = db.prepare(`SELECT COUNT(*) as c FROM orders ${wc}`).get(...wcp)
    const ordersToday = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE date(created_at) = date('now') ${websiteId ? 'AND website_id = ?' : ''}`).get(...(websiteId ? [websiteId] : []))
    const ordersPending = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE status = 'pending' ${websiteId ? 'AND website_id = ?' : ''}`).get(...(websiteId ? [websiteId] : []))
    const ordersCompleted = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE status IN ('completed','fulfilled') ${websiteId ? 'AND website_id = ?' : ''}`).get(...(websiteId ? [websiteId] : []))
    const ordersCancelled = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE status = 'cancelled' ${websiteId ? 'AND website_id = ?' : ''}`).get(...(websiteId ? [websiteId] : []))
    const ordersTrial = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE is_trial = 1 AND status != 'cancelled' ${websiteId ? 'AND website_id = ?' : ''}`).get(...(websiteId ? [websiteId] : []))
    const ordersPaid = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE (is_trial = 0 OR is_trial IS NULL) AND status IN ('completed','fulfilled') ${websiteId ? 'AND website_id = ?' : ''}`).get(...(websiteId ? [websiteId] : []))
    const ordersByMethod = db.prepare(`
      SELECT
        CASE WHEN stripe_payment_id IS NOT NULL AND stripe_payment_id != '' THEN 'stripe'
             WHEN paypal_payment_id IS NOT NULL AND paypal_payment_id != '' THEN 'paypal'
             WHEN sellup_order_id IS NOT NULL AND sellup_order_id != '' THEN 'sellup'
             WHEN payment_id IS NOT NULL AND payment_id != '' THEN 'other'
             ELSE 'pending' END as method,
        COUNT(*) as count
      FROM orders WHERE status IN ('completed','fulfilled') ${websiteId ? 'AND website_id = ?' : ''}
      GROUP BY method ORDER BY count DESC
    `).all(...(websiteId ? [websiteId] : []))
    const ordersRecent = db.prepare(`SELECT id, customer_email, plan_id, is_trial, amount, status, created_at FROM orders ${wc} ORDER BY created_at DESC LIMIT 20`).all(...wcp)

    // Revenue
    const revenueTotal = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE status IN ('completed','fulfilled') ${websiteId ? 'AND website_id = ?' : ''}`).get(...(websiteId ? [websiteId] : []))
    const revenueToday = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE status IN ('completed','fulfilled') AND date(created_at) = date('now') ${websiteId ? 'AND website_id = ?' : ''}`).get(...(websiteId ? [websiteId] : []))
    const revenueByDay = db.prepare(`SELECT date(created_at) as day, COALESCE(SUM(amount), 0) as revenue, COUNT(*) as count FROM orders WHERE status IN ('completed','fulfilled') AND created_at > datetime('now', '-30 days') ${websiteId ? 'AND website_id = ?' : ''} GROUP BY date(created_at) ORDER BY day`).all(...(websiteId ? [websiteId] : []))

    // Stock alerts
    const stockAlerts = db.prepare(`
      SELECT sa.*, pc.name as provider_name, pp.plan_name, pp.duration_months,
        (SELECT COUNT(*) FROM activation_codes WHERE provider_id = sa.provider_id AND plan_id = sa.plan_id AND status = 'available') as current_stock
      FROM stock_alerts sa
      JOIN providers_catalog pc ON sa.provider_id = pc.id
      JOIN provider_plans pp ON sa.plan_id = pp.id
      ${websiteId ? 'WHERE pc.website_id = ?' : ''}
    `).all(...(websiteId ? [websiteId] : []))

    // Low stock warnings
    const lowStock = db.prepare(`
      SELECT pc.name as provider, pp.plan_name, pp.duration_months,
        (SELECT COUNT(*) FROM activation_codes WHERE provider_id = pp.provider_id AND plan_id = pp.id AND status = 'available') as available,
        COALESCE(pp.min_stock, 5) as min_stock
      FROM provider_plans pp JOIN providers_catalog pc ON pp.provider_id = pc.id
      WHERE pp.active = 1
        AND (SELECT COUNT(*) FROM activation_codes WHERE provider_id = pp.provider_id AND plan_id = pp.id AND status = 'available') < COALESCE(pp.min_stock, 5)
      ${websiteId ? 'AND pp.website_id = ?' : ''}
    `).all(...(websiteId ? [websiteId] : []))

    res.json({
      activationCodes: {
        total: (activationTotal || {}).c || 0,
        available: (activationAvailable || {}).c || 0,
        used: (activationUsed || {}).c || 0,
        expired: (activationExpired || {}).c || 0,
        byProvider: activationByProvider,
        byPlan: activationByPlan,
      },
      trialCodes: {
        total: (trialTotal || {}).c || 0,
        available: (trialAvailable || {}).c || 0,
        used: (trialUsed || {}).c || 0,
        byProvider: trialByProvider,
      },
      orders: {
        total: (ordersTotal || {}).c || 0,
        today: (ordersToday || {}).c || 0,
        pending: (ordersPending || {}).c || 0,
        completed: (ordersCompleted || {}).c || 0,
        cancelled: (ordersCancelled || {}).c || 0,
        trial: (ordersTrial || {}).c || 0,
        paid: (ordersPaid || {}).c || 0,
        byMethod: ordersByMethod,
        recent: ordersRecent,
      },
      revenue: {
        total: (revenueTotal || {}).total || 0,
        today: (revenueToday || {}).total || 0,
        byDay: revenueByDay,
      },
      alerts: {
        stockAlerts,
        lowStock,
      },
      updatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[Internal] Stock overview error:', err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/internal/verify-credits — verify user has enough credits
router.post('/verify-credits', (req, res) => {
  res.json({ supported: false, error: 'Credits managed by Payment Engine' })
})

module.exports = router
