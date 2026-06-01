const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { getDb } = require('../db');
const { createOrder } = require('../services/sellupService');
const { assignTrial } = require('../services/codeAssigner');
const { sendTrial } = require('../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_to_random_string';

router.post('/api/checkout/direct', async (req, res) => {
  try {
    const { planId } = req.body;
    if (!planId) return res.status(400).json({ error: 'planId required' });

    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
        userId = decoded.id;
      } catch {}
    }

    const db = getDb();
    const wid = req.website ? req.website.id : 1;
    const plan = db.prepare(`
      SELECT pp.*, pc.name as provider_name
      FROM provider_plans pp
      JOIN providers_catalog pc ON pp.provider_id = pc.id
      WHERE pp.id = ? AND pp.website_id = ? AND pc.website_id = ?
    `).get(planId, wid, wid);

    if (!plan) return res.status(404).json({ error: 'plan_not_found' });

    const orderResult = db.prepare(`
      INSERT INTO orders (plan_id, provider_id, amount, status, source, user_id, website_id)
      VALUES (?, ?, ?, 'pending', 'direct_buy', ?, ?)
    `).run(plan.id, plan.provider_id, plan.price_sell, userId, wid);

    const orderId = orderResult.lastInsertRowid;

    if (plan.paypal_link) {
      return res.json({ checkoutUrl: plan.paypal_link, orderId, planName: plan.plan_name, providerName: plan.provider_name });
    }

    if (plan.sellup_product_id) {
      const checkoutUrl = await createOrder({
        productId: plan.sellup_product_id,
        orderId,
        amount: plan.price_sell,
      });
      db.prepare('UPDATE orders SET sellup_order_id = ? WHERE id = ?').run(checkoutUrl, orderId);
      return res.json({ checkoutUrl, orderId });
    }

    res.json({
      checkoutUrl: null,
      error: 'not_configured',
      orderId,
      planName: plan.plan_name,
      providerName: plan.provider_name,
    });
  } catch (e) {
    console.error('Direct checkout error:', e);
    res.status(500).json({ error: 'server_error' });
  }
});

router.post('/api/trial/claim', async (req, res) => {
  const { name, email, phone, providerId, sessionId } = req.body;
  if (!email || !providerId) {
    return res.status(400).json({ error: 'email and providerId required' });
  }

  const db = getDb();

  const provider = db.prepare('SELECT id, name FROM providers_catalog WHERE id = ? AND active = 1').get(providerId);
  if (!provider) return res.status(404).json({ error: 'Provider not found' });

  const trialPlan = db.prepare(
    "SELECT id, plan_name FROM provider_plans WHERE provider_id = ? AND plan_type = 'trial' AND active = 1 LIMIT 1"
  ).get(providerId);
  if (!trialPlan) return res.status(400).json({ error: 'No trial plan for this provider' });

  const wid = req.website ? req.website.id : 1;
  const orderResult = db.prepare(
    "INSERT INTO orders (session_id, customer_name, customer_email, customer_phone, provider_id, plan_id, is_trial, status, website_id) VALUES (?, ?, ?, ?, ?, ?, 1, 'completed', ?)"
  ).run(sessionId || null, name || null, email, phone || null, providerId, trialPlan.id, wid);

  const trialCreds = assignTrial(orderResult.lastInsertRowid, providerId);
  if (!trialCreds) {
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('failed', orderResult.lastInsertRowid);
    db.prepare(
      "INSERT INTO admin_notifications (type, title, message, related_id) VALUES (?, ?, ?, ?)"
    ).run('trial_stockout', 'Trial codes exhausted',
      `Visitor ${name || email} requested a trial for ${provider.name} but no codes are available.`,
      orderResult.lastInsertRowid);
    return res.status(400).json({ error: 'No trial codes available' });
  }

  db.prepare('UPDATE orders SET trial_code_id = (SELECT id FROM trial_codes WHERE used_by_order_id = ?) WHERE id = ?').run(
    orderResult.lastInsertRowid, orderResult.lastInsertRowid
  );

  try {
    await sendTrial({
      email,
      name,
      credentials: trialCreds,
      durationHours: trialCreds.duration_hours || 72,
      providerName: provider.name,
      planName: trialPlan.plan_name,
    });
  } catch (e) {
    console.error('Trial email error:', e);
  }

  db.prepare(
    'INSERT INTO agent_log (agent, action, details, order_id, session_id) VALUES (?, ?, ?, ?, ?)'
  ).run('System', 'trial_claim', `Trial claimed by ${email} for ${provider.name}`, orderResult.lastInsertRowid, sessionId || null);

  res.json({ success: true, provider_name: provider.name, duration_hours: trialCreds.duration_hours || 72 });
});

router.get('/api/checkout/settings', (req, res) => {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM app_settings WHERE key IN ('crypto_address_usdt', 'crypto_address_btc', 'sepa_iban', 'sepa_bic', 'sepa_bank_name', 'site_name', 'paypal_email', 'paypal_mode', 'stripe_publishable_key', 'payment_methods_enabled', 'google_client_id', 'apple_client_id')").all();
  const s = {};
  for (const r of rows) s[r.key] = r.value;
  let enabled = ['paypal', 'crypto', 'email', 'sepa', 'stripe'];
  try { enabled = JSON.parse(s.payment_methods_enabled || '[]'); } catch {}
  res.json({
    crypto: { usdt: s.crypto_address_usdt || null, btc: s.crypto_address_btc || null },
    sepa: { iban: s.sepa_iban || null, bic: s.sepa_bic || null, bank: s.sepa_bank_name || null },
    paypalEmail: s.paypal_email || null,
    paypalMode: s.paypal_mode || 'sandbox',
    stripePublishableKey: s.stripe_publishable_key || null,
    googleClientId: s.google_client_id || null,
    appleClientId: s.apple_client_id || null,
    paymentMethodsEnabled: enabled,
    siteName: s.site_name || 'IPTV Boss',
  });
});

router.post('/api/checkout/send-link', async (req, res) => {
  try {
    const { planId, email } = req.body;
    if (!planId || !email) return res.status(400).json({ error: 'planId and email required' });

    const db = getDb();
    const wid = req.website ? req.website.id : 1;
    const plan = db.prepare(`
      SELECT pp.*, pc.name as provider_name
      FROM provider_plans pp
      JOIN providers_catalog pc ON pp.provider_id = pc.id
      WHERE pp.id = ? AND pp.website_id = ? AND pc.website_id = ?
    `).get(planId, wid, wid);
    if (!plan) return res.status(404).json({ error: 'plan_not_found' });

    const orderResult = db.prepare(`
      INSERT INTO orders (plan_id, provider_id, amount, status, source, customer_email, website_id)
      VALUES (?, ?, ?, 'pending', 'email_link', ?, ?)
    `).run(plan.id, plan.provider_id, plan.price_sell, email, wid);

    const orderId = orderResult.lastInsertRowid;
    const siteUrl = (db.prepare("SELECT value FROM app_settings WHERE key = 'site_url'").get() || {}).value || process.env.SITE_URL || 'http://localhost:3000';
    const paymentUrl = plan.paypal_link || `${siteUrl}/checkout?order=${orderId}`;

    try {
      const { sendPaymentLink } = require('../services/emailService');
      await sendPaymentLink({ email, name: email.split('@')[0], checkoutUrl: paymentUrl, planName: plan.plan_name, amount: plan.price_sell, orderId });
    } catch (e) {
      console.error('Send payment link email error:', e);
    }

    res.json({ success: true, orderId, paymentUrl });
  } catch (e) {
    console.error('Send link error:', e);
    res.status(500).json({ error: 'server_error' });
  }
});

router.get('/api/providers/active', (req, res) => {
  const db = getDb();
  const wid = req.website ? req.website.id : 1;
  const providers = db.prepare(`
    SELECT DISTINCT p.id, p.name, p.specialty, p.logo_url, pp.id as plan_id, pp.plan_name
    FROM providers_catalog p
    JOIN provider_plans pp ON pp.provider_id = p.id
    WHERE pp.plan_type = 'trial' AND pp.active = 1 AND p.active = 1
      AND pp.website_id = ? AND p.website_id = ?
    ORDER BY p.name
  `).all(wid, wid);
  res.json(providers);
});

module.exports = router;
