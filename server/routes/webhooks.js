const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { assignCode } = require('../services/codeAssigner');
const { sendThankYou, sendCredentials } = require('../services/emailService');
const { verifyWebhookSignature } = require('../services/sellupService');
const { handleWebhookEvent } = require('../services/stripeService');

router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    if (!sig) return res.status(401).send('No signature');

    const Stripe = require('stripe');
    const db = getDb();
    const webhookSecret = (db.prepare("SELECT value FROM app_settings WHERE key = 'stripe_webhook_secret'").get() || {}).value || process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) return res.status(401).send('Webhook not configured');

    let event;
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (e) {
      console.error('[Stripe] Webhook signature verification failed:', e.message);
      return res.status(401).send('Invalid signature');
    }

    console.log(`[Stripe] Webhook received: ${event.type}`);
    const result = await handleWebhookEvent(event);
    res.json({ received: true, ...result });
  } catch (e) {
    console.error('[Stripe] Webhook error:', e);
    res.status(400).json({ received: false, error: e.message });
  }
});

router.post('/sellup', async (req, res) => {
  try {
    const signature = req.headers['x-sellup-signature'];
    if (!verifyWebhookSignature(req.body, signature)) {
      console.error('Invalid webhook signature');
      return res.status(401).send('Invalid signature');
    }

    const event = JSON.parse(req.body);
    console.log('Sellup webhook received:', event.event);

    if (event.event === 'order.completed') {
      const internalOrderId = event.data?.metadata?.internal_order_id;
      const sellupOrderId = event.data?.id;

      if (!internalOrderId) {
        return res.json({ received: true, error: 'No internal_order_id in metadata' });
      }

      const db = getDb();
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(internalOrderId);

      if (!order) {
        console.error(`Order ${internalOrderId} not found`);
        return res.json({ received: true, error: 'Order not found' });
      }

      if (order.status === 'completed') {
        return res.json({ received: true, note: 'Already processed' });
      }

      db.prepare(
        "UPDATE orders SET status = 'completed', sellup_order_id = COALESCE(?, sellup_order_id), payment_confirmed_at = datetime('now') WHERE id = ?"
      ).run(sellupOrderId || '', internalOrderId);

      await sendThankYou({ email: order.customer_email, name: order.customer_name });

      const credentials = assignCode(internalOrderId, order.provider_id, order.plan_id);
      if (credentials) {
        const codeRow = db.prepare('SELECT id FROM activation_codes WHERE used_by_order_id = ?').get(internalOrderId);
        if (codeRow) {
          db.prepare('UPDATE orders SET activation_code_id = ? WHERE id = ?').run(codeRow.id, internalOrderId);
        }

        setTimeout(async () => {
          try {
            await sendCredentials({
              email: order.customer_email,
              name: order.customer_name,
              credentials,
            });
            const db2 = getDb();
            db2.prepare("UPDATE orders SET credentials_sent_at = datetime('now') WHERE id = ?").run(internalOrderId);
          } catch (e) {
            console.error('Delayed credentials email error:', e);
          }
        }, 3 * 60 * 1000);

        db.prepare(
          'INSERT INTO agent_log (agent, action, details, order_id) VALUES (?, ?, ?, ?)'
        ).run('System', 'payment_completed', `Order ${internalOrderId} paid, code assigned`, internalOrderId);
      } else {
        console.error(`No codes available for order ${internalOrderId}`);
        db.prepare(
          'INSERT INTO agent_log (agent, action, details, order_id) VALUES (?, ?, ?, ?)'
        ).run('System', 'stock_issue', `No codes available for order ${internalOrderId}`, internalOrderId);
      }

      db.prepare('UPDATE chat_sessions SET converted = 1 WHERE id = ?').run(order.session_id);
    }

    res.json({ received: true });
  } catch (e) {
    console.error('Webhook error:', e);
    res.status(400).json({ received: false, error: e.message });
  }
});

module.exports = router;
