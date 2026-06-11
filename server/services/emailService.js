const nodemailer = require('nodemailer');

function renderEmailTemplate(templateKey, vars) {
  const { getDb } = require('../db');
  const db = getDb();
  const t = db.prepare('SELECT * FROM email_templates WHERE template_key = ?').get(templateKey);
  let body = t ? t.body_html : '';
  let subject = t ? t.subject : '';
  // Fall back to plan-specific then default
  if (!body && templateKey.includes('plan_')) {
    const base = templateKey.replace(/plan_\d+_/, '');
    const def = db.prepare('SELECT * FROM email_templates WHERE template_key = ?').get(base + 'default');
    if (def) { body = def.body_html; subject = def.subject; }
  }
  if (!body) return null;
  // Replace {{variable}} placeholders
  for (const [k, v] of Object.entries(vars)) {
    if (v !== null && v !== undefined) {
      body = body.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
      subject = subject.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
    }
  }
  // Handle {{#if var}}...{{/if}} blocks
  body = body.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, name, content) => {
    return vars[name] ? content : '';
  });
  return { body, subject };
}

function getTransporter() {
  const { getDb } = require('../db');
  const db = getDb();

  const host = (db.prepare("SELECT value FROM app_settings WHERE key = 'smtp_host'").get() || {}).value || process.env.SMTP_HOST;
  const port = parseInt((db.prepare("SELECT value FROM app_settings WHERE key = 'smtp_port'").get() || {}).value || process.env.SMTP_PORT || '587');
  const user = (db.prepare("SELECT value FROM app_settings WHERE key = 'smtp_user'").get() || {}).value || process.env.SMTP_USER;
  const pass = (db.prepare("SELECT value FROM app_settings WHERE key = 'smtp_pass'").get() || {}).value || process.env.SMTP_PASS;
  const fromName = (db.prepare("SELECT value FROM app_settings WHERE key = 'smtp_from_name'").get() || {}).value || process.env.SMTP_FROM_NAME || 'Dalletek';
  const fromEmail = (db.prepare("SELECT value FROM app_settings WHERE key = 'smtp_from_email'").get() || {}).value || process.env.SMTP_FROM_EMAIL;

  const isLocal = host === 'localhost' || host === '127.0.0.1';
  const t = nodemailer.createTransport({
    host: host || 'smtp.gmail.com',
    port: port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
    ...(isLocal ? { tls: { rejectUnauthorized: false }, ignoreTLS: true } : {}),
  });

  t.fromName = fromName;
  t.fromEmail = fromEmail;
  return t;
}

function renderTemplate(body) {
  const { getDb } = require('../db');
  const db = getDb();
  const siteName = (db.prepare("SELECT value FROM app_settings WHERE key = 'site_name'").get() || {}).value || process.env.SITE_NAME || 'Dalletek';
  const supportEmail = (db.prepare("SELECT value FROM app_settings WHERE key = 'support_email'").get() || {}).value || process.env.SUPPORT_EMAIL || 'support@iptvboss.com';
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
<div style="background:#1a1a1a;border-radius:16px;border:1px solid #2a2a2a;padding:40px;">
<div style="text-align:center;margin-bottom:32px;">
<h1 style="color:#00d4ff;font-size:24px;margin:0;">${siteName}</h1>
</div>
${body}
</div>
<div style="text-align:center;margin-top:24px;color:#666;font-size:13px;">
<p>${siteName} — ${supportEmail}</p>
</div>
</div>
</body></html>`;
}

async function sendPaymentLink({ email, name, checkoutUrl, planName, amount, orderId }) {
  try {
    const t = getTransporter();
    const { getDb } = require('../db');
    const db = getDb();
    const siteName = (db.prepare("SELECT value FROM app_settings WHERE key = 'site_name'").get() || {}).value || process.env.SITE_NAME || 'Dalletek';
    const tpl = renderEmailTemplate('payment_link_default', {
      customer_name: name, customer_email: email, checkout_url: checkoutUrl,
      plan_name: planName, amount, order_id: orderId, site_name: siteName,
    });
    const bodyHtml = tpl ? tpl.body : `
      <h2 style="color:#fff;margin:0 0 16px;">Your checkout link is ready</h2>
      <p style="color:#a0a0a0;margin:0 0 24px;">Hi ${name}, click below to complete your IPTV subscription.</p>
      ${planName ? `<div style="background:#0f0f0f;border-radius:8px;padding:16px;margin:16px 0;"><p style="color:#00d4ff;margin:0 0 4px;font-size:14px;">${planName}</p>${amount ? `<p style="color:#fff;margin:0;font-size:20px;font-weight:700;">$${amount}</p>` : ''}${orderId ? `<p style="color:#666;margin:4px 0 0;font-size:12px;">Order #${orderId}</p>` : ''}</div>` : ''}
      <div style="text-align:center;margin:32px 0;"><a href="${checkoutUrl}" style="display:inline-block;background:#00d4ff;color:#000;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:700;font-size:16px;">Complete Payment</a></div>
      <p style="color:#666;font-size:13px;margin:0;">Your credentials will arrive after payment confirmation.</p>`;
    const subject = tpl ? tpl.subject : `Your ${siteName} checkout link`;
    await t.sendMail({
      from: `"${t.fromName}" <${t.fromEmail}>`,
      to: email,
      subject,
      html: renderTemplate(bodyHtml),
    });
    return true;
  } catch (e) {
    console.error('sendPaymentLink error:', e);
    return false;
  }
}

async function sendThankYou({ email, name }) {
  try {
    const t = getTransporter();
    const body = `
      <h2 style="color:#fff;margin:0 0 16px;">Payment confirmed! ✅</h2>
      <p style="color:#a0a0a0;margin:0 0 16px;">Thanks ${name}, your payment was successful.</p>
      <p style="color:#a0a0a0;margin:0;">Your activation credentials will arrive within minutes.</p>`;
    await t.sendMail({
      from: `"${t.fromName}" <${t.fromEmail}>`,
      to: email,
      subject: 'Payment confirmed!',
      html: renderTemplate(body),
    });
    return true;
  } catch (e) {
    console.error('sendThankYou error:', e);
    return false;
  }
}

async function sendCredentials({ email, name, credentials, providerName, planName }) {
  try {
    const t = getTransporter();
    const tpl = renderEmailTemplate('credentials_default', {
      customer_name: name, customer_email: email,
      username: credentials.username, password: credentials.password,
      server_url: credentials.server_url, code: credentials.code,
      provider_name: providerName, plan_name: planName,
    });
    const bodyHtml = tpl ? tpl.body : `
      <h2 style="color:#fff;margin:0 0 16px;">Your IPTV credentials</h2>
      <p style="color:#a0a0a0;margin:0 0 24px;">Hi ${name}, here's everything you need to start watching.</p>
      <div style="background:#0f0f0f;border-radius:8px;padding:20px;margin:0 0 24px;font-family:monospace;">
        ${credentials.username ? `<p style="color:#00d4ff;margin:0 0 8px;">Username: <span style="color:#fff;">${credentials.username}</span></p>` : ''}
        ${credentials.password ? `<p style="color:#00d4ff;margin:0 0 8px;">Password: <span style="color:#fff;">${credentials.password}</span></p>` : ''}
        ${credentials.server_url ? `<p style="color:#00d4ff;margin:0 0 8px;">Server: <span style="color:#fff;">${credentials.server_url}</span></p>` : ''}
        ${credentials.code ? `<p style="color:#00d4ff;margin:0;">Code: <span style="color:#fff;">${credentials.code}</span></p>` : ''}
      </div>
      <p style="color:#666;font-size:13px;margin:0 0 8px;">Setup instructions:</p>
      <ol style="color:#a0a0a0;font-size:13px;margin:0;padding-left:20px;">
        <li>Download an IPTV player (TiviMate, IPTV Smarters, or VLC)</li>
        <li>Enter the server URL and your credentials</li>
        <li>Enjoy your channels!</li>
      </ol>`;
    await t.sendMail({
      from: `"${t.fromName}" <${t.fromEmail}>`,
      to: email,
      subject: (tpl ? tpl.subject : 'Your IPTV activation credentials'),
      html: renderTemplate(bodyHtml),
    });
    return true;
  } catch (e) {
    console.error('sendCredentials error:', e);
    return false;
  }
}

async function sendStockAlert({ providerName, planName, remaining, threshold }) {
  try {
    const t = getTransporter();
    const { getDb } = require('../db');
    const db = getDb();
    const supportEmail = (db.prepare("SELECT value FROM app_settings WHERE key = 'support_email'").get() || {}).value || process.env.SUPPORT_EMAIL || 'support@iptvboss.com';
    const body = `
      <h2 style="color:#ff4444;margin:0 0 16px;">⚠️ Low Stock Alert</h2>
      <p style="color:#a0a0a0;margin:0 0 16px;">Provider: <strong style="color:#fff;">${providerName}</strong></p>
      <p style="color:#a0a0a0;margin:0 0 16px;">Plan: <strong style="color:#fff;">${planName}</strong></p>
      <p style="color:#a0a0a0;margin:0 0 16px;">Codes remaining: <strong style="color:#ff4444;">${remaining}</strong></p>
      <p style="color:#a0a0a0;margin:0 0 16px;">Threshold: ${threshold}</p>
      <div style="background:#0f0f0f;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="color:#a0a0a0;margin:0;font-size:13px;">Import more codes before stock runs out.</p>
      </div>`;
    await t.sendMail({
      from: `"${t.fromName}" <${t.fromEmail}>`,
      to: supportEmail,
      subject: `⚠️ Low Stock: ${providerName} ${planName} — ${remaining} codes left`,
      html: renderTemplate(body),
    });
    return true;
  } catch (e) {
    console.error('sendStockAlert error:', e);
    return false;
  }
}

async function sendTrial({ email, name, credentials, durationHours, providerName, planName }) {
  try {
    const t = getTransporter();
    const { getDb } = require('../db');
    const db = getDb();
    const siteUrl = (db.prepare("SELECT value FROM app_settings WHERE key = 'site_url'").get() || {}).value || process.env.SITE_URL || 'http://localhost:3000';
    const siteName = (db.prepare("SELECT value FROM app_settings WHERE key = 'site_name'").get() || {}).value || process.env.SITE_NAME || 'Dalletek';
    const tpl = renderEmailTemplate('trial_default', {
      customer_name: name, customer_email: email,
      username: credentials.username, password: credentials.password, server_url: credentials.server_url,
      duration_hours: durationHours || 72, site_name: siteName, site_url: siteUrl,
      provider_name: providerName, plan_name: planName,
    });
    const bodyHtml = tpl ? tpl.body : `
      <h2 style="color:#fff;margin:0 0 16px;">Your ${durationHours || 72}h trial is ready!</h2>
      <p style="color:#a0a0a0;margin:0 0 24px;">Hi ${name}, start watching now.</p>
      <div style="background:#0f0f0f;border-radius:8px;padding:20px;margin:0 0 24px;font-family:monospace;">
        ${credentials.username ? `<p style="color:#00d4ff;margin:0 0 8px;">Username: <span style="color:#fff;">${credentials.username}</span></p>` : ''}
        ${credentials.password ? `<p style="color:#00d4ff;margin:0 0 8px;">Password: <span style="color:#fff;">${credentials.password}</span></p>` : ''}
        ${credentials.server_url ? `<p style="color:#00d4ff;margin:0 0 8px;">Server: <span style="color:#fff;">${credentials.server_url}</span></p>` : ''}
      </div>
      <div style="text-align:center;margin-top:24px;">
        <a href="${siteUrl}/#plans" style="display:inline-block;background:#00d4ff;color:#000;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:700;">Upgrade to Full Access</a>
      </div>`;
    const subject = tpl ? tpl.subject : `Your ${durationHours || 72}h ${siteName} trial is ready!`;
    await t.sendMail({
      from: `"${t.fromName}" <${t.fromEmail}>`,
      to: email,
      subject,
      html: renderTemplate(bodyHtml),
    });
    return true;
  } catch (e) {
    console.error('sendTrial error:', e);
    return false;
  }
}

module.exports = { sendPaymentLink, sendThankYou, sendCredentials, sendTrial, sendStockAlert, getTransporter };
