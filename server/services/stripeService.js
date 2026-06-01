const Stripe = require('stripe');
const { getDb } = require('../db');

function getStripe() {
  const db = getDb();
  const secretKey = (db.prepare("SELECT value FROM app_settings WHERE key = 'stripe_secret_key'").get() || {}).value || process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey);
}

async function createCheckoutSession({ plan, email, orderId, websiteId, successUrl, cancelUrl }) {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe not configured');

  const db = getDb();
  const siteUrl = (db.prepare("SELECT value FROM app_settings WHERE key = 'site_url'").get() || {}).value || process.env.SITE_URL || 'http://localhost:3000';

  const priceId = plan.stripe_price_id;
  if (!priceId) throw new Error('No Stripe price ID mapped to this plan');

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: email,
    metadata: {
      actual_plan_id: String(plan.id),
      order_id: String(orderId),
      website_id: String(websiteId),
    },
    success_url: successUrl || `${siteUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl || `${siteUrl}/payment/cancel`,
  });

  return session;
}

async function handleWebhookEvent(event) {
  if (event.type !== 'checkout.session.completed') return { handled: false };

  const session = event.data.object;
  const metadata = session.metadata || {};
  const actualPlanId = metadata.actual_plan_id;
  const orderId = metadata.order_id;
  const websiteId = metadata.website_id;

  if (!actualPlanId || !orderId) {
    console.error('[Stripe] Missing metadata in checkout session');
    return { handled: false, error: 'Missing metadata' };
  }

  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) {
    console.error(`[Stripe] Order ${orderId} not found`);
    return { handled: false, error: 'Order not found' };
  }

  if (order.status === 'completed') {
    return { handled: true, note: 'Already processed' };
  }

  const stripePaymentId = session.payment_intent || session.id;

  db.prepare(
    "UPDATE orders SET status = 'completed', stripe_payment_id = ?, payment_confirmed_at = datetime('now') WHERE id = ?"
  ).run(stripePaymentId, orderId);

  const { sendThankYou, sendCredentials } = require('./emailService');
  await sendThankYou({ email: order.customer_email, name: order.customer_name });

  const { assignCode } = require('./codeAssigner');
  const credentials = assignCode(orderId, order.provider_id, order.plan_id);
  if (credentials) {
    const codeRow = db.prepare('SELECT id FROM activation_codes WHERE used_by_order_id = ?').get(orderId);
    if (codeRow) {
      db.prepare('UPDATE orders SET activation_code_id = ? WHERE id = ?').run(codeRow.id, orderId);
    }

    setTimeout(async () => {
      try {
        await sendCredentials({
          email: order.customer_email,
          name: order.customer_name,
          credentials,
        });
        const db2 = getDb();
        db2.prepare("UPDATE orders SET credentials_sent_at = datetime('now') WHERE id = ?").run(orderId);
      } catch (e) {
        console.error('[Stripe] Delayed credentials email error:', e);
      }
    }, 3 * 60 * 1000);

    db.prepare(
      'INSERT INTO agent_log (agent, action, details, order_id) VALUES (?, ?, ?, ?)'
    ).run('System', 'payment_completed', `Stripe payment ${stripePaymentId} confirmed for order ${orderId}`, orderId);
  } else {
    console.error(`[Stripe] No codes available for order ${orderId}`);
    db.prepare(
      'INSERT INTO agent_log (agent, action, details, order_id) VALUES (?, ?, ?, ?)'
    ).run('System', 'stock_issue', `No codes available for order ${orderId}`, orderId);
  }

  db.prepare('UPDATE chat_sessions SET converted = 1 WHERE id = ?').run(order.session_id);

  return { handled: true };
}

module.exports = { createCheckoutSession, handleWebhookEvent, getStripe };
