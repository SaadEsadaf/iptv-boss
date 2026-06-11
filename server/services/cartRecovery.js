const { getDb } = require('../db');
const { getTransporter } = require('./emailService');

function getSettings() {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM app_settings WHERE key IN ('site_name', 'site_url', 'paypal_email')").all();
  const s = {};
  for (const r of rows) s[r.key] = r.value;
  s.site_name ||= 'Dalletek';
  s.site_url ||= 'https://dalletek.live';
  return s;
}

async function sendRecoveryEmail(order) {
  try {
    const s = getSettings();
    const t = getTransporter();
    const hoursAgo = Math.round((Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60));
    const paypalEmail = s.paypal_email || 'iboplayer.service@gmail.com';
    const planName = order.plan_name || 'Premium';
    const amount = order.amount || 14.99;
    const contactLink = `${s.site_url}/dashboard`;

    const templates = {
      first: {
        subject: `⏳ ${order.customer_name || 'Hi'}, your ${planName} order is waiting!`,
        body: `
          <div style="text-align:center;padding:20px;">
            <div style="font-size:48px;margin-bottom:8px;">🛒</div>
            <h2 style="color:#ffaa00;font-size:20px;margin:0 0 12px;">You haven't completed your order yet</h2>
            <p style="color:#a0a0a0;font-size:14px;margin:0 0 20px;">Your ${planName} plan (€${amount}) is reserved. Complete payment to get instant access.</p>
          </div>
          <div style="background:#0f0f0f;border-radius:12px;padding:20px;margin-bottom:20px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
              <span style="color:#666;">Plan</span>
              <span style="color:#fff;font-weight:600;">${planName}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
              <span style="color:#666;">Amount</span>
              <span style="color:#ffd700;font-weight:700;">€${amount}</span>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="color:#666;">Order</span>
              <span style="color:#666;">#${order.id}</span>
            </div>
          </div>
          <div style="text-align:center;">
            <p style="color:#a0a0a0;font-size:14px;margin-bottom:16px;">Send <strong>€${amount}</strong> via PayPal Friends & Family to:</p>
            <div style="background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:12px;margin-bottom:16px;font-family:monospace;font-size:16px;color:#00d4ff;">
              ${paypalEmail}
            </div>
            <a href="https://paypal.com" target="_blank" style="display:inline-block;background:#ffd700;color:#000;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:700;">💳 Pay via PayPal</a>
            <p style="color:#666;font-size:12px;margin-top:12px;">After payment, reply to this email and we'll activate instantly.</p>
          </div>`,
      },
      urgent: {
        subject: `🔥 ${order.customer_name || 'Hi'}, your ${planName} reservation ends soon!`,
        body: `
          <div style="text-align:center;padding:20px;">
            <div style="font-size:48px;margin-bottom:8px;">⏰</div>
            <h2 style="color:#ff4444;font-size:20px;margin:0 0 12px;">Last chance — your order expires!</h2>
            <p style="color:#a0a0a0;font-size:14px;margin:0 0 20px;">Your ${planName} (€${amount}) reservation is about to expire. Don't lose your spot!</p>
          </div>
          <div style="background:linear-gradient(135deg,#1a0a0a,#2a1a1a);border:2px solid #ff444430;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
            <p style="color:#ffd700;font-size:18px;font-weight:700;margin:0 0 8px;">🎁 Order #${order.id} — Still available</p>
            <p style="color:#a0a0a0;font-size:13px;margin:0 0 16px;">Send €${amount} to PayPal and your credentials will be sent immediately.</p>
            <div style="background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:12px;font-family:monospace;font-size:16px;color:#ffd700;">
              ${paypalEmail}
            </div>
            <a href="https://paypal.com" target="_blank" style="display:inline-block;margin-top:16px;background:linear-gradient(135deg,#ff4444,#ff2d92);color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:700;">🔥 Complete Payment</a>
          </div>`,
      },
    };

    // First email (2-12h) or urgent (12h+)
    const templateKey = hoursAgo < 12 ? 'first' : 'urgent';
    const tpl = templates[templateKey];

    const fullHtml = `<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#0a0a0a;color:#fff;padding:20px;">
      <div style="max-width:560px;margin:0 auto;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#1a1a2e,#0a0a1a);padding:20px;text-align:center;">
          <span style="font-size:20px;color:#00d4ff;font-weight:700;">${s.site_name}</span>
        </div>
        ${tpl.body}
        <div style="text-align:center;padding:20px;border-top:1px solid #1a1a1a;color:#666;font-size:12px;">
          <p>${s.site_name} — <a href="${s.site_url}" style="color:#00d4ff;">${s.site_url}</a></p>
        </div>
      </div>
    </div>`;

    await t.sendMail({
      from: `"${s.site_name}" <${t.fromEmail}>`,
      to: order.customer_email,
      subject: tpl.subject,
      html: fullHtml,
    });

    return true;
  } catch (e) {
    console.error('Recovery email error:', e.message);
    return false;
  }
}

async function processCartRecovery() {
  const db = getDb();

  // Get pending orders older than 2 hours that haven't had recovery emails sent
  const pendingOrders = db.prepare(`
    SELECT o.*, pp.plan_name, pc.name as provider_name
    FROM orders o
    LEFT JOIN provider_plans pp ON o.plan_id = pp.id
    LEFT JOIN providers_catalog pc ON o.provider_id = pc.id
    WHERE o.status = 'pending' AND o.customer_email IS NOT NULL
      AND o.created_at < datetime('now', '-2 hours')
      AND o.id NOT IN (
        SELECT related_id FROM agent_log 
        WHERE agent = 'CartRecovery' AND action = 'recovery_email'
        AND created_at > datetime('now', '-7 days')
      )
    ORDER BY o.created_at ASC
  `).all();

  const results = { checked: 0, sent: 0, skipped: 0 };

  for (const order of pendingOrders) {
    results.checked++;

    // Check if already sent a recovery for this order
    const alreadySent = db.prepare(`
      SELECT id FROM agent_log WHERE agent = 'CartRecovery' AND details LIKE ?
    `).get(`%order #${order.id}%`);
    if (alreadySent) { results.skipped++; continue; }

    const sent = await sendRecoveryEmail(order);
    if (sent) {
      db.prepare(
        "INSERT INTO agent_log (agent, action, details, order_id) VALUES (?, ?, ?, ?)"
      ).run('CartRecovery', 'recovery_email', `Recovery email sent for order #${order.id} (${order.customer_email})`, order.id);
      results.sent++;

      // Notify admin too
      try {
        const { notifyPendingOrder } = require('./notificationService');
        notifyPendingOrder({ orderId: order.id, name: order.customer_name, email: order.customer_email, planName: order.plan_name || 'Plan', amount: order.amount, hoursAgo: Math.round((Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60)) }).catch(() => {});
      } catch {}

      // Rate limit
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  return results;
}

module.exports = { processCartRecovery };