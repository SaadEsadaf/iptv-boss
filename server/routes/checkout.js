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

  try {
    const { enrollTrialUser } = require('../services/salesEngine')
    enrollTrialUser(orderResult.lastInsertRowid, email, name || null, trialCreds).catch(() => {})
  } catch (e) {}

  res.json({ success: true, provider_name: provider.name, duration_hours: trialCreds.duration_hours || 72 });
});

router.get('/api/checkout/settings', (req, res) => {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM app_settings WHERE key IN ('crypto_address_usdt', 'crypto_address_btc', 'sepa_iban', 'sepa_bic', 'sepa_bank_name', 'site_name', 'paypal_email', 'paypal_mode', 'stripe_publishable_key', 'payment_methods_enabled', 'google_client_id', 'apple_client_id')").all();
  const s = {};
  for (const r of rows) s[r.key] = r.value;
  let enabled = ['paypal', 'crypto', 'email', 'sepa', 'stripe', 'sellup'];
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
    siteName: s.site_name || 'Dalletek',
  });
});

router.post('/api/checkout/stripe-checkout', async (req, res) => {
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

    if (!plan.stripe_price_id) {
      return res.status(400).json({ error: 'stripe_not_configured' });
    }

    const orderResult = db.prepare(`
      INSERT INTO orders (plan_id, provider_id, amount, status, source, customer_email, customer_name, website_id)
      VALUES (?, ?, ?, 'pending', 'stripe', ?, ?, ?)
    `).run(plan.id, plan.provider_id, plan.price_sell, email, email.split('@')[0], wid);

    const orderId = orderResult.lastInsertRowid;
    const siteUrl = (db.prepare("SELECT value FROM app_settings WHERE key = 'site_url'").get() || {}).value || process.env.SITE_URL || 'http://localhost:3000';

    const { createCheckoutSession } = require('../services/stripeService');
    const session = await createCheckoutSession({
      plan,
      email,
      orderId,
      websiteId: wid,
      successUrl: `${siteUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${siteUrl}/payment/cancel`,
    });

    db.prepare('UPDATE orders SET stripe_payment_id = ? WHERE id = ?').run(session.id, orderId);

    res.json({ url: session.url, orderId, sessionId: session.id });
  } catch (e) {
    console.error('Stripe checkout error:', e);
    res.status(500).json({ error: e.message || 'server_error' });
  }
});

router.post('/api/checkout/paypal-checkout', async (req, res) => {
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

    if (plan.paypal_link) {
      const orderResult2 = db.prepare(`
        INSERT INTO orders (plan_id, provider_id, amount, status, source, customer_email, customer_name, website_id)
        VALUES (?, ?, ?, 'pending', 'paypal', ?, ?, ?)
      `).run(plan.id, plan.provider_id, plan.price_sell, email, email.split('@')[0], wid);
      return res.json({ url: plan.paypal_link, orderId: orderResult2.lastInsertRowid });
    }

    const { isConfigured, createOrder: createPaypalOrder } = require('../services/paypalService');

    if (!isConfigured()) {
      return res.json({ fallback: true, orderId: null, message: 'paypal_not_configured' });
    }

    const orderResult = db.prepare(`
      INSERT INTO orders (plan_id, provider_id, amount, status, source, customer_email, customer_name, website_id)
      VALUES (?, ?, ?, 'pending', 'paypal', ?, ?, ?)
    `).run(plan.id, plan.provider_id, plan.price_sell, email, email.split('@')[0], wid);

    const orderId = orderResult.lastInsertRowid;
    const siteUrl = (db.prepare("SELECT value FROM app_settings WHERE key = 'site_url'").get() || {}).value || process.env.SITE_URL || 'http://localhost:3000';

    const paypalOrder = await createPaypalOrder({
      amount: plan.price_sell,
      currency: 'EUR',
      orderId,
      returnUrl: `${siteUrl}/api/checkout/paypal-capture?order_id=${orderId}`,
      cancelUrl: `${siteUrl}/payment/cancel`,
    });

    db.prepare('UPDATE orders SET paypal_order_id = ? WHERE id = ?').run(paypalOrder.id, orderId);

    res.json({ url: paypalOrder.approvalUrl, orderId, paypalOrderId: paypalOrder.id });
  } catch (e) {
    console.error('PayPal checkout error:', e);
    res.status(500).json({ error: e.message || 'server_error' });
  }
});

router.get('/api/checkout/paypal-capture', async (req, res) => {
  try {
    const { order_id, token } = req.query;
    if (!order_id) return res.redirect('/payment/cancel');

    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id);
    if (!order) return res.redirect('/payment/cancel');

    if (order.status === 'completed') {
      return res.redirect(`/payment/success?paypal_order_id=${token || ''}`);
    }

    const paypalOrderId = order.paypal_order_id;
    if (!paypalOrderId) return res.redirect('/payment/cancel');

    const { captureOrder } = require('../services/paypalService');
    const result = await captureOrder(paypalOrderId);

    if (!result.completed) {
      console.error(`PayPal capture failed for order ${order_id}: status=${result.status}`);
      return res.redirect('/payment/cancel');
    }

    db.prepare(`
      UPDATE orders SET status = 'completed', paypal_payment_id = ?, payment_confirmed_at = datetime('now') WHERE id = ?
    `).run(result.captureId || '', order_id);

    const { sendThankYou } = require('../services/emailService');
    await sendThankYou({ email: order.customer_email, name: order.customer_name });

    const { assignCode } = require('../services/codeAssigner');
    const credentials = assignCode(order_id, order.provider_id, order.plan_id);
    if (credentials) {
      const codeRow = db.prepare('SELECT id FROM activation_codes WHERE used_by_order_id = ?').get(order_id);
      if (codeRow) {
        db.prepare('UPDATE orders SET activation_code_id = ? WHERE id = ?').run(codeRow.id, order_id);
      }
      setTimeout(async () => {
        try {
          const { sendCredentials } = require('../services/emailService');
          await sendCredentials({ email: order.customer_email, name: order.customer_name, credentials });
          const db2 = getDb();
          db2.prepare("UPDATE orders SET credentials_sent_at = datetime('now') WHERE id = ?").run(order_id);
        } catch (e) {
          console.error('Delayed credentials email error:', e);
        }
      }, 3 * 60 * 1000);
    } else {
      console.error(`No codes available for order ${order_id}`);
      db.prepare(
        'INSERT INTO agent_log (agent, action, details, order_id) VALUES (?, ?, ?, ?)'
      ).run('System', 'stock_issue', `No codes available for order ${order_id}`, order_id);
    }

    db.prepare(
      'INSERT INTO agent_log (agent, action, details, order_id) VALUES (?, ?, ?, ?)'
    ).run('System', 'payment_completed', `Order ${order_id} paid via PayPal, code assigned`, order_id);

    res.redirect(`/payment/success?paypal_order_id=${paypalOrderId}`);
  } catch (e) {
    console.error('PayPal capture error:', e);
    res.redirect('/payment/cancel');
  }
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

    const { sendPaymentLink } = require('../services/emailService');
    const emailSent = await sendPaymentLink({ email, name: email.split('@')[0], checkoutUrl: paymentUrl, planName: plan.plan_name, amount: plan.price_sell, orderId });

    if (!emailSent) {
      console.warn('Payment link email failed to send');
      return res.status(500).json({ error: 'email_failed', orderId, paymentUrl });
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
