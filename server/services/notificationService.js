const { getDb } = require('../db');
const { getTransporter } = require('./emailService');

function getSettings() {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM app_settings WHERE key IN ('support_email', 'admin_email', 'paypal_email', 'site_name', 'telegram_bot_token', 'telegram_chat_id', 'admin_phone')").all();
  const s = {};
  for (const r of rows) s[r.key] = r.value;
  return s;
}

// Email notification to admin
async function sendEmailToAdmin(subject, htmlBody) {
  try {
    const t = getTransporter();
    const s = getSettings();
    const to = s.admin_email || s.support_email || s.paypal_email || 'babilon26@gmail.com';
    const siteName = s.site_name || 'Dalletek';
    const fullHtml = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#0a0a0a;color:#fff;padding:20px;">
        <div style="max-width:600px;margin:0 auto;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:24px;">
          <div style="text-align:center;margin-bottom:20px;">
            <span style="font-size:24px;">📺</span>
            <h2 style="color:#00d4ff;margin:4px 0 0;font-size:18px;">${siteName}</h2>
          </div>
          ${htmlBody}
          <div style="text-align:center;margin-top:24px;color:#666;font-size:12px;">
            <p>${siteName} — Notification System</p>
          </div>
        </div>
      </div>`;
    await t.sendMail({
      from: `"${siteName}" <${t.fromEmail}>`,
      to,
      subject: `[${siteName}] ${subject}`,
      html: fullHtml,
    });
    return true;
  } catch (e) {
    console.error('Admin email error:', e);
    return false;
  }
}

// Telegram notification to admin
async function sendTelegram(message) {
  try {
    const db = getDb();
    const token = (db.prepare("SELECT value FROM app_settings WHERE key = 'telegram_bot_token'").get() || {}).value;
    const chatId = (db.prepare("SELECT value FROM app_settings WHERE key = 'telegram_chat_id'").get() || {}).value;
    if (!token || !chatId) return false;
    const axios = require('axios');
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: message.substring(0, 4000),
      parse_mode: 'HTML',
    }, { timeout: 10000 });
    return true;
  } catch (e) {
    console.error('Telegram notify error:', e);
    return false;
  }
}

// WhatsApp via CallMeBot
async function sendWhatsApp(message) {
  try {
    const db = getDb();
    const phone = (db.prepare("SELECT value FROM app_settings WHERE key = 'admin_phone'").get() || {}).value;
    if (!phone) return false;
    const axios = require('axios');
    await axios.get(`https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message.substring(0, 1600))}&apikey=&source=web`, { timeout: 10000 });
    return true;
  } catch (e) {
    console.error('WhatsApp notify error:', e);
    return false;
  }
}

// Notify on trial claim
async function notifyTrialClaim({ name, email, phone, providerName, planName, durationHours, preferredApp }) {
  const date = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
  const emailBody = `
    <div style="background:#0a1628;border:2px solid #00d4ff30;border-radius:12px;padding:20px;margin-bottom:16px;text-align:center;">
      <span style="font-size:40px;">🧪</span>
      <h2 style="color:#00d4ff;margin:8px 0;font-size:20px;">Nouvel Essai Gratuit!</h2>
      <p style="color:#a0a0a0;font-size:13px;">Un visiteur a réclamé un essai — ${date}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <tr><td style="color:#666;padding:6px 0;border-bottom:1px solid #1a1a1a;">Nom</td><td style="color:#fff;padding:6px 0;border-bottom:1px solid #1a1a1a;text-align:right;">${name || 'N/A'}</td></tr>
      <tr><td style="color:#666;padding:6px 0;border-bottom:1px solid #1a1a1a;">Email</td><td style="color:#00d4ff;padding:6px 0;border-bottom:1px solid #1a1a1a;text-align:right;">${email}</td></tr>
      <tr><td style="color:#666;padding:6px 0;border-bottom:1px solid #1a1a1a;">Téléphone</td><td style="color:#fff;padding:6px 0;border-bottom:1px solid #1a1a1a;text-align:right;">${phone || '-'}</td></tr>
      <tr><td style="color:#666;padding:6px 0;border-bottom:1px solid #1a1a1a;">Provider</td><td style="color:#fff;padding:6px 0;border-bottom:1px solid #1a1a1a;text-align:right;">${providerName}</td></tr>
      <tr><td style="color:#666;padding:6px 0;border-bottom:1px solid #1a1a1a;">Forfait</td><td style="color:#fff;padding:6px 0;border-bottom:1px solid #1a1a1a;text-align:right;">${planName}</td></tr>
      <tr><td style="color:#666;padding:6px 0;border-bottom:1px solid #1a1a1a;">Durée</td><td style="color:#fff;padding:6px 0;border-bottom:1px solid #1a1a1a;text-align:right;">${durationHours}h</td></tr>
      <tr><td style="color:#666;padding:6px 0;">Appareil</td><td style="color:#fff;padding:6px 0;text-align:right;">${preferredApp || 'Non spécifié'}</td></tr>
    </table>`;

  const tgMsg = `🧪 Nouvel Essai!
📧 ${email}
📋 ${planName} — ${providerName}
⏱ ${durationHours}h
📱 ${preferredApp || '-'}
🕐 ${date}`;

  await Promise.allSettled([
    sendEmailToAdmin(`🧪 Nouvel essai: ${email}`, emailBody),
    sendTelegram(tgMsg),
    sendWhatsApp(tgMsg),
  ]);
}

// Notify on purchase
async function notifyPurchase({ name, email, planName, providerName, amount, isTrial }) {
  const date = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
  const type = isTrial ? '🧪 Essai confirmé (€1)' : '💰 Achat';
  const emailBody = `
    <div style="background:#0a1a0a;border:2px solid #00cc6630;border-radius:12px;padding:20px;margin-bottom:16px;text-align:center;">
      <span style="font-size:40px;">${isTrial ? '🧪' : '💰'}</span>
      <h2 style="color:#00cc66;margin:8px 0;font-size:20px;">${isTrial ? 'Paiement Essai Confirmé' : 'Nouvel Achat!'}</h2>
      <p style="color:#a0a0a0;font-size:13px;">${date}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <tr><td style="color:#666;padding:6px 0;border-bottom:1px solid #1a1a1a;">Nom</td><td style="color:#fff;padding:6px 0;border-bottom:1px solid #1a1a1a;text-align:right;">${name || 'N/A'}</td></tr>
      <tr><td style="color:#666;padding:6px 0;border-bottom:1px solid #1a1a1a;">Email</td><td style="color:#00d4ff;padding:6px 0;border-bottom:1px solid #1a1a1a;text-align:right;">${email}</td></tr>
      <tr><td style="color:#666;padding:6px 0;border-bottom:1px solid #1a1a1a;">Forfait</td><td style="color:#fff;padding:6px 0;border-bottom:1px solid #1a1a1a;text-align:right;">${planName}</td></tr>
      <tr><td style="color:#666;padding:6px 0;border-bottom:1px solid #1a1a1a;">Provider</td><td style="color:#fff;padding:6px 0;border-bottom:1px solid #1a1a1a;text-align:right;">${providerName}</td></tr>
      ${amount ? `<tr><td style="color:#666;padding:6px 0;border-bottom:1px solid #1a1a1a;">Montant</td><td style="color:#ffd700;font-weight:700;padding:6px 0;border-bottom:1px solid #1a1a1a;text-align:right;">€${amount}</td></tr>` : ''}
    </table>`;

  const tgMsg = `${type}
📧 ${email}
📋 ${planName} — ${providerName}
${amount ? `💶 €${amount}` : ''}
🕐 ${date}`;

  await Promise.allSettled([
    sendEmailToAdmin(`${type}: ${email}`, emailBody),
    sendTelegram(tgMsg),
    sendWhatsApp(tgMsg),
  ]);
}

// Notify on pending order (abandoned cart)
async function notifyPendingOrder({ orderId, name, email, planName, amount, hoursAgo }) {
  const date = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
  const emailBody = `
    <div style="background:#1a1a0a;border:2px solid #ffaa0030;border-radius:12px;padding:20px;margin-bottom:16px;text-align:center;">
      <span style="font-size:40px;">⏳</span>
      <h2 style="color:#ffaa00;margin:8px 0;font-size:20px;">Panier abandonné</h2>
      <p style="color:#a0a0a0;font-size:13px;">Commande #${orderId} en attente depuis ${hoursAgo}h</p>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <tr><td style="color:#666;padding:6px 0;border-bottom:1px solid #1a1a1a;">Commande</td><td style="color:#fff;padding:6px 0;border-bottom:1px solid #1a1a1a;text-align:right;">#${orderId}</td></tr>
      <tr><td style="color:#666;padding:6px 0;border-bottom:1px solid #1a1a1a;">Email</td><td style="color:#00d4ff;padding:6px 0;border-bottom:1px solid #1a1a1a;text-align:right;">${email}</td></tr>
      <tr><td style="color:#666;padding:6px 0;border-bottom:1px solid #1a1a1a;">Forfait</td><td style="color:#fff;padding:6px 0;border-bottom:1px solid #1a1a1a;text-align:right;">${planName}</td></tr>
      ${amount ? `<tr><td style="color:#666;padding:6px 0;border-bottom:1px solid #1a1a1a;">Montant</td><td style="color:#ffd700;font-weight:700;padding:6px 0;border-bottom:1px solid #1a1a1a;text-align:right;">€${amount}</td></tr>` : ''}
      <tr><td style="color:#666;padding:6px 0;">Attente</td><td style="color:#ffaa00;padding:6px 0;text-align:right;">${hoursAgo}h</td></tr>
    </table>`;

  const tgMsg = `⏳ Panier abandonné #${orderId}
📧 ${email}
📋 ${planName}${amount ? ` | 💶 €${amount}` : ''}
⏱ En attente depuis ${hoursAgo}h
🕐 ${date}`;

  await Promise.allSettled([
    sendEmailToAdmin(`⏳ Panier abandonné #${orderId}: ${email}`, emailBody),
    sendTelegram(tgMsg),
    sendWhatsApp(tgMsg),
  ]);
}

// Notify low stock
async function notifyLowStock({ providerName, planName, remaining }) {
  const emailBody = `
    <div style="background:#1a0a0a;border:2px solid #ff444430;border-radius:12px;padding:20px;margin-bottom:16px;text-align:center;">
      <span style="font-size:40px;">⚠️</span>
      <h2 style="color:#ff4444;margin:8px 0;font-size:20px;">Stock épuisé</h2>
    </div>
    <p style="color:#fff;font-size:15px;">${providerName} — ${planName}</p>
    <p style="color:#ff4444;font-size:24px;font-weight:700;text-align:center;">${remaining} codes restants</p>`;

  const tgMsg = `⚠️ Stock bas: ${providerName} ${planName} — ${remaining} codes restants!`;

  await Promise.allSettled([
    sendEmailToAdmin(`⚠️ Stock bas: ${providerName} ${planName}`, emailBody),
    sendTelegram(tgMsg),
    sendWhatsApp(tgMsg),
  ]);
}

module.exports = { notifyTrialClaim, notifyPurchase, notifyPendingOrder, notifyLowStock, sendTelegram, sendWhatsApp };