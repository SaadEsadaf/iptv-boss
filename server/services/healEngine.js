const { getDb } = require('../db');
const { getTransporter } = require('./emailService');

// Knowledge base of common fixes
const FIXES = {
  email: {
    check: [
      { desc: 'Vérifier SMTP host', check: () => {
        const db = getDb();
        const host = (db.prepare("SELECT value FROM app_settings WHERE key = 'smtp_host'").get() || {}).value;
        return host && host !== 'localhost' ? { ok: true, value: host } : { ok: false, value: host };
      }, fix: async () => {
        const db = getDb();
        const existing = (db.prepare("SELECT value FROM app_settings WHERE key = 'smtp_host'").get() || {}).value;
        if (!existing || existing === 'localhost') {
          db.prepare("UPDATE app_settings SET value = 'smtp-relay.brevo.com' WHERE key = 'smtp_host'").run();
          db.prepare("UPDATE app_settings SET value = '587' WHERE key = 'smtp_port'").run();
          return { fixed: true, action: 'SMTP réglé sur Brevo' };
        }
        return { fixed: false, action: 'SMTP déjà configuré' };
      }},
      { desc: 'Vérifier clé API Brevo', check: () => {
        const db = getDb();
        const user = (db.prepare("SELECT value FROM app_settings WHERE key = 'smtp_user'").get() || {}).value;
        const pass = (db.prepare("SELECT value FROM app_settings WHERE key = 'smtp_pass'").get() || {}).value;
        return user && pass ? { ok: true } : { ok: false, reason: 'Identifiants SMTP manquants' };
      }, fix: async () => {
        return { fixed: false, action: '❌ Impossible de réparer: identifiants SMTP requis dans Admin → Settings' };
      }},
    ],
    priority: 'critical',
    label: '📧 Email',
  },
  trialCodes: {
    check: [
      { desc: 'Vérifier stock codes essai', check: () => {
        const db = getDb();
        const avail = db.prepare("SELECT COUNT(*) as c FROM trial_codes WHERE status = 'available'").get().c;
        return avail > 0 ? { ok: true, value: avail } : { ok: false, value: avail };
      }, fix: async () => {
        return { fixed: false, action: '⚠️ Plus de codes essai. Allez dans Admin → Codes → Import pour en ajouter.' };
      }},
    ],
    priority: 'critical',
    label: '🎟️ Codes Essai',
  },
  sniffers: {
    check: [
      { desc: 'Vérifier sniffers activés', check: () => {
        const db = getDb();
        const tg = (db.prepare("SELECT value FROM app_settings WHERE key = 'telegram_sniffer_enabled'").get() || {}).value;
        const rd = (db.prepare("SELECT value FROM app_settings WHERE key = 'reddit_sniffer_enabled'").get() || {}).value;
        const tw = (db.prepare("SELECT value FROM app_settings WHERE key = 'twitter_sniffer_enabled'").get() || {}).value;
        const enabled = [tg === '1' && 'Telegram', rd === '1' && 'Reddit', tw === '1' && 'Twitter'].filter(Boolean);
        return enabled.length > 0 ? { ok: true, value: enabled.join(', ') } : { ok: false, value: [] };
      }, fix: async () => {
        const db = getDb();
        db.prepare("UPDATE app_settings SET value = '1' WHERE key = 'telegram_sniffer_enabled'").run();
        db.prepare("UPDATE app_settings SET value = '1' WHERE key = 'reddit_sniffer_enabled'").run();
        db.prepare("UPDATE app_settings SET value = '1' WHERE key = 'twitter_sniffer_enabled'").run();
        return { fixed: true, action: 'Sniffers Telegram, Reddit, Twitter activés' };
      }},
      { desc: 'Vérifier leads récents', check: () => {
        const db = getDb();
        const last = db.prepare("SELECT created_at FROM demand_signals ORDER BY created_at DESC LIMIT 1").get();
        if (!last) return { ok: false, reason: 'Aucun lead trouvé' };
        const hours = (Date.now() - new Date(last.created_at).getTime()) / (1000 * 60 * 60);
        return hours < 24 ? { ok: true, value: `Dernier lead: ${Math.round(hours)}h` } : { ok: false, reason: `Pas de lead depuis ${Math.round(hours)}h` };
      }, fix: async () => {
        return { fixed: false, action: 'ℹ️ Les sniffers sont actifs mais aucun lead trouvé. Les sources Telegram/Reddit peuvent être inactives.' };
      }},
    ],
    priority: 'high',
    label: '🔍 Sniffers',
  },
  payments: {
    check: [
      { desc: 'Vérifier PayPal configuré', check: () => {
        const db = getDb();
        const email = (db.prepare("SELECT value FROM app_settings WHERE key = 'paypal_email'").get() || {}).value;
        return email ? { ok: true, value: email } : { ok: false };
      }, fix: async () => {
        return { fixed: false, action: '❌ PayPal email non configuré. Ajoutez-le dans Admin → Settings → Paiements.' };
      }},
    ],
    priority: 'high',
    label: '💳 Paiements',
  },
  brain: {
    check: [
      { desc: 'Vérifier cycle cerveau', check: () => {
        const db = getDb();
        const last = db.prepare("SELECT created_at FROM sales_engine_log WHERE action = 'brain_cycle' ORDER BY id DESC LIMIT 1").get();
        if (!last) return { ok: false, reason: 'Aucun cycle' };
        const hours = (Date.now() - new Date(last.created_at).getTime()) / (1000 * 60 * 60);
        return hours < 3 ? { ok: true, value: `${Math.round(hours)}h` } : { ok: false, reason: `${Math.round(hours)}h inactif` };
      }, fix: async () => {
        return { fixed: false, action: 'ℹ️ Le cycle cerveau devrait reprendre automatiquement. Vérifiez que PM2 tourne.' };
      }},
    ],
    priority: 'medium',
    label: '🧠 Cerveau',
  },
};

async function investigate(issueKey) {
  const fix = FIXES[issueKey];
  if (!fix) return { issue: issueKey, status: 'unknown', actions: [] };

  const results = [];
  for (const step of fix.check) {
    try {
      const checkResult = step.check();
      if (!checkResult.ok) {
        const fixResult = await step.fix();
        results.push({
          check: step.desc,
          status: checkResult.ok ? '✅ ok' : '❌ échec',
          detail: checkResult.reason || checkResult.value || '',
          fix: fixResult,
        });
      } else {
        results.push({
          check: step.desc,
          status: '✅ ok',
          detail: checkResult.value || '',
          fix: null,
        });
      }
    } catch (e) {
      results.push({ check: step.desc, status: '❌ erreur', detail: e.message, fix: { fixed: false, action: 'Exception' } });
    }
  }

  const fixed = results.filter(r => r.fix?.fixed).length;
  const failed = results.filter(r => r.status.includes('❌')).length;

  return {
    issue: issueKey,
    label: fix.label,
    priority: fix.priority,
    status: failed === 0 ? '✅ tout ok' : fixed > 0 ? '🔧 réparé' : '❌ nécessite intervention',
    actions: results,
    fixed,
    failed,
  };
}

async function healAll() {
  const db = getDb();
  const results = {};
  let totalFixed = 0;
  let totalFailed = 0;

  for (const key of Object.keys(FIXES)) {
    const result = await investigate(key);
    results[key] = result;
    totalFixed += result.fixed || 0;
    totalFailed += result.failed || 0;
  }

  // Log the healing session
  db.prepare(
    "INSERT INTO agent_log (agent, action, details) VALUES (?, ?, ?)"
  ).run('HealEngine', 'heal_session', `Heal session: ${totalFixed} fixed, ${totalFailed} need intervention`);

  return { results, totalFixed, totalFailed };
}

async function healAndNotify() {
  const result = await healAll();
  const db = getDb();
  const s = {};
  const rows = db.prepare("SELECT key, value FROM app_settings WHERE key IN ('site_name', 'admin_email')").all();
  for (const r of rows) s[r.key] = r.value;

  const needHelp = Object.entries(result.results)
    .filter(([, v]) => v.status === '❌ nécessite intervention')
    .map(([k, v]) => `❌ ${v.label}: ${v.actions.filter(a => a.status.includes('❌')).map(a => a.detail).join(', ')}`);

  const fixed = Object.entries(result.results)
    .filter(([, v]) => v.status === '🔧 réparé')
    .map(([k, v]) => `🔧 ${v.label}: ${v.actions.filter(a => a.fix?.fixed).map(a => a.fix.action).join(', ')}`);

  const emailBody = `
    <div style="text-align:center;padding:20px;">
      <div style="font-size:48px;margin-bottom:8px;">🔧</div>
      <h2 style="color:#00d4ff;margin:0;font-size:20px;">Auto-Réparation Système</h2>
      <p style="color:#a0a0a0;font-size:13px;margin:8px 0;">${result.totalFixed} réparé(s) · ${result.totalFailed} problème(s)</p>
    </div>
    ${fixed.length > 0 ? `
    <div style="background:#00cc6615;border:1px solid #00cc6630;border-radius:10px;padding:16px;margin-bottom:16px;">
      <h3 style="color:#00cc66;margin:0 0 8px;font-size:14px;">🔧 Réparations automatiques</h3>
      ${fixed.map(f => `<p style="margin:4px 0;font-size:13px;color:#fff;">${f}</p>`).join('')}
    </div>` : ''}
    ${needHelp.length > 0 ? `
    <div style="background:#ff444415;border:1px solid #ff444430;border-radius:10px;padding:16px;">
      <h3 style="color:#ff4444;margin:0 0 8px;font-size:14px;">❌ Nécessite votre intervention</h3>
      ${needHelp.map(n => `<p style="margin:4px 0;font-size:13px;color:#fff;">${n}</p>`).join('')}
    </div>` : '<p style="color:#00cc66;font-size:14px;text-align:center;">✅ Tout fonctionne correctement</p>'}
    <div style="text-align:center;margin-top:16px;color:#666;font-size:12px;">
      <p><a href="https://dalletek.live/admin" style="color:#00d4ff;">Admin →</a></p>
    </div>`;

  const fullHtml = `<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#0a0a0a;color:#fff;padding:20px;">
    <div style="max-width:560px;margin:0 auto;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:16px;overflow:hidden;padding:20px;">
      ${emailBody}
    </div>
  </div>`;

  try {
    const t = getTransporter();
    await t.sendMail({
      from: `"${s.site_name}" <${t.fromEmail}>`,
      to: s.admin_email || 'babilon26@gmail.com',
      subject: `🔧 Auto-Réparation: ${result.totalFixed} réparé(s), ${result.totalFailed} besoin d'aide`,
      html: fullHtml,
    });
  } catch (e) {
    console.error('Heal notify error:', e.message);
  }

  return result;
}

module.exports = { investigate, healAll, healAndNotify };