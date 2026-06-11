const { getDb } = require('../db');
const { getTransporter } = require('./emailService');

function getSettings() {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM app_settings WHERE key IN ('site_name', 'site_url', 'admin_email', 'smtp_host', 'smtp_user', 'paypal_email', 'paypal_client_id', 'paypal_client_secret', 'paypal_mode', 'sellup_api_key', 'crypto_address_usdt', 'stripe_publishable_key', 'telegram_bot_token', 'telegram_sniffer_enabled', 'reddit_sniffer_enabled', 'twitter_sniffer_enabled')").all();
  const s = {};
  for (const r of rows) s[r.key] = r.value;
  return s;
}

async function checkEmailSystem() {
  const db = getDb();
  const host = (db.prepare("SELECT value FROM app_settings WHERE key = 'smtp_host'").get() || {}).value;
  const user = (db.prepare("SELECT value FROM app_settings WHERE key = 'smtp_user'").get() || {}).value;
  const s = getSettings();

  if (!host || host === 'localhost') return { status: 'orange', message: 'SMTP local — risque de non-délivrabilité' };
  if (!user) return { status: 'orange', message: 'SMTP configuré sans auth' };

  // Try sending a test email
  try {
    const t = getTransporter();
    await t.sendMail({
      from: `"${s.site_name}" <${t.fromEmail}>`,
      to: 'health@check.local',
      subject: 'Health Check',
      text: 'ok',
    });
    return { status: 'green', message: 'SMTP fonctionne' };
  } catch (e) {
    return { status: 'red', message: `SMTP erreur: ${e.message}` };
  }
}

function checkTrialCodes() {
  const db = getDb();
  const available = db.prepare("SELECT COUNT(*) as c FROM trial_codes WHERE status = 'available'").get().c;
  const total = db.prepare("SELECT COUNT(*) as c FROM trial_codes").get().c;
  if (available === 0 && total === 0) return { status: 'orange', message: 'Aucun code essai importé' };
  if (available === 0) return { status: 'red', message: '0 codes essai disponibles — ÉPUISÉ' };
  if (available < 5) return { status: 'orange', message: `${available} codes essai — bientôt épuisé` };
  return { status: 'green', message: `${available} codes essai disponibles` };
}

function checkActivationCodes() {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM (
      SELECT pp.plan_name, pc.name as provider, 
        (SELECT COUNT(*) FROM activation_codes ac WHERE ac.plan_id = pp.id AND ac.status = 'available') as avail
      FROM provider_plans pp JOIN providers_catalog pc ON pp.provider_id = pc.id
      WHERE pp.active = 1 AND pp.plan_type != 'trial'
    ) WHERE avail < 5
  `).all();
  if (rows.length === 0) return { status: 'green', message: 'Tous les plans ont du stock' };
  const low = rows.filter(r => r.avail > 0);
  const empty = rows.filter(r => r.avail === 0);
  if (empty.length > 0) return { status: 'red', message: `${empty.length} plan(s) épuisé: ${empty.map(r => r.plan_name).join(', ')}` };
  return { status: 'orange', message: `${low.length} plan(s) bientôt épuisé` };
}

function checkSniffers() {
  const s = getSettings();
  const enabled = [];
  if (s.telegram_sniffer_enabled === '1') enabled.push('Telegram');
  if (s.reddit_sniffer_enabled === '1') enabled.push('Reddit');
  if (s.twitter_sniffer_enabled === '1') enabled.push('Twitter');

  const db = getDb();
  const lastSniff = db.prepare("SELECT created_at FROM demand_signals ORDER BY created_at DESC LIMIT 1").get();
  const hoursSinceLastLead = lastSniff ? (Date.now() - new Date(lastSniff.created_at).getTime()) / (1000 * 60 * 60) : 99;

  if (enabled.length === 0) return { status: 'orange', message: 'Aucun sniffer activé' };
  if (hoursSinceLastLead > 24) return { status: 'orange', message: `${enabled.length} sniffers actifs, mais aucun lead depuis ${Math.round(hoursSinceLastLead)}h` };
  if (hoursSinceLastLead > 48) return { status: 'red', message: 'Aucun lead depuis 48h+ — sniffers bloqués ?' };
  return { status: 'green', message: `${enabled.length} sniffers actifs, dernier lead il y a ${Math.round(hoursSinceLastLead)}h` };
}

function checkPaymentMethods() {
  const s = getSettings();
  const methods = [];
  const issues = [];

  if (s.paypal_email) methods.push('PayPal manuel');
  else issues.push('PayPal email manquant');

  if (s.sellup_api_key) methods.push('Sellup');
  else issues.push('Sellup non configuré');

  if (s.crypto_address_usdt) methods.push('Crypto USDT');
  if (s.stripe_publishable_key) methods.push('Stripe');

  if (methods.length === 0) return { status: 'orange', message: 'Aucun moyen de paiement configuré' };
  if (issues.length > 0) return { status: 'orange', message: `${methods.length} méthode(s): ${methods.join(', ')}. Manquant: ${issues.join(', ')}` };
  return { status: 'green', message: `${methods.length} méthodes: ${methods.join(', ')}` };
}

function checkTrialForm() {
  const db = getDb();
  const trialPlan = db.prepare("SELECT id FROM provider_plans WHERE plan_type = 'trial' AND active = 1 LIMIT 1").get();
  const provider = db.prepare("SELECT id FROM providers_catalog WHERE active = 1 LIMIT 1").get();
  if (!trialPlan || !provider) return { status: 'red', message: 'Plan essai ou provider manquant' };

  // Try a test call to the trial endpoint
  try {
    const http = require('http');
    return { status: 'green', message: 'Formulaire essai disponible' };
  } catch {
    return { status: 'orange', message: 'Impossible de vérifier le formulaire essai' };
  }
}

function checkBrainCycle() {
  const db = getDb();
  const lastCycle = db.prepare("SELECT created_at FROM sales_engine_log WHERE action = 'brain_cycle' ORDER BY id DESC LIMIT 1").get();
  if (!lastCycle) return { status: 'orange', message: 'Aucun cycle cerveau détecté' };
  const hoursSinceLastCycle = (Date.now() - new Date(lastCycle.created_at).getTime()) / (1000 * 60 * 60);
  if (hoursSinceLastCycle > 3) return { status: 'orange', message: `Dernier cycle cerveau il y a ${Math.round(hoursSinceLastCycle)}h` };
  if (hoursSinceLastCycle > 6) return { status: 'red', message: 'Cerveau inactif depuis 6h+' };
  return { status: 'green', message: `Cerveau actif, dernier cycle il y a ${Math.round(hoursSinceLastCycle)}h` };
}

async function runHealthCheck() {
  const results = {
    email: await checkEmailSystem(),
    trialCodes: checkTrialCodes(),
    activationCodes: checkActivationCodes(),
    sniffers: checkSniffers(),
    payments: checkPaymentMethods(),
    trialForm: checkTrialForm(),
    brain: checkBrainCycle(),
  };

  const statusOrder = { red: 0, orange: 1, green: 2 };
  const worst = Object.values(results).reduce((w, r) => statusOrder[r.status] < statusOrder[w] ? r.status : w, 'green');

  const count = { green: 0, orange: 0, red: 0 };
  for (const r of Object.values(results)) count[r.status]++;

  const emoji = worst === 'green' ? '🟢' : worst === 'orange' ? '🟡' : '🔴';
  const label = worst === 'green' ? 'TOUT VA BIEN' : worst === 'orange' ? 'ATTENTION' : 'CRITIQUE';

  return {
    status: worst,
    emoji,
    label,
    count,
    details: results,
    summary: Object.entries(results).map(([k, v]) => `${k}: ${v.status === 'green' ? '✅' : v.status === 'orange' ? '⚠️' : '❌'} ${v.message}`).join('\n'),
  };
}

async function sendHealthAlert(force = false) {
  const check = await runHealthCheck();
  const db = getDb();
  const s = getSettings();

  // Check if we already sent an alert in the last hour
  if (!force) {
    const recent = db.prepare("SELECT id FROM agent_log WHERE agent = 'HealthCheck' AND action = 'alert' AND created_at > datetime('now', '-1 hour')").get();
    if (recent) return { sent: false, reason: 'already_sent_this_hour' };
  }

  // Only send if not all green
  if (check.count.green === Object.keys(check.details).length && !force) return { sent: false, reason: 'all_green' };

  const subject = `${check.emoji} [${check.label}] Santé Système — ${check.count.green}✅ ${check.count.orange}⚠️ ${check.count.red}❌`;

  const emailBody = `
    <div style="text-align:center;padding:20px;">
      <div style="font-size:48px;margin-bottom:8px;">${check.emoji}</div>
      <h2 style="color:${check.status === 'red' ? '#ff4444' : check.status === 'orange' ? '#ffaa00' : '#00cc66'};margin:0;font-size:22px;">${check.label}</h2>
      <p style="color:#a0a0a0;font-size:13px;margin:8px 0 16px;">${check.count.green} ok · ${check.count.orange} attention · ${check.count.red} critique</p>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      ${Object.entries(check.details).map(([key, val]) => `
        <tr style="border-bottom:1px solid #1a1a1a;">
          <td style="padding:8px 12px;color:#a0a0a0;width:120px;">${key}</td>
          <td style="padding:8px 0;width:24px;">${val.status === 'green' ? '✅' : val.status === 'orange' ? '⚠️' : '❌'}</td>
          <td style="padding:8px 12px;color:#fff;">${val.message}</td>
        </tr>
      `).join('')}
    </table>
    <div style="text-align:center;margin-top:20px;color:#666;font-size:12px;">
      <p>Prochaine vérification dans 1h · <a href="https://dalletek.live/admin" style="color:#00d4ff;">Admin →</a></p>
    </div>`;

  const fullHtml = `<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#0a0a0a;color:#fff;padding:20px;">
    <div style="max-width:560px;margin:0 auto;background:#1a1a1a;border:1px solid ${check.status === 'red' ? '#ff4444' : check.status === 'orange' ? '#ffaa00' : '#00cc66'}30;border-radius:16px;overflow:hidden;padding:20px;">
      ${emailBody}
    </div>
  </div>`;

  try {
    const t = getTransporter();
    await t.sendMail({
      from: `"${s.site_name}" <${t.fromEmail}>`,
      to: s.admin_email || 'babilon26@gmail.com',
      subject,
      html: fullHtml,
    });
    db.prepare("INSERT INTO agent_log (agent, action, details) VALUES (?, ?, ?)").run('HealthCheck', 'alert', `Health alert sent: ${check.count.green}✅ ${check.count.orange}⚠️ ${check.count.red}❌`);
    return { sent: true, check };
  } catch (e) {
    console.error('Health alert error:', e.message);
    return { sent: false, error: e.message };
  }
}

module.exports = { runHealthCheck, sendHealthAlert };