const { getDb } = require('../db');
const { getTransporter } = require('./emailService');

const MILESTONES = [
  { key: 'no_login_6h', hours: 6, action: 'login_check', label: 'No login after 6h — setup help' },
  { key: 'expiring_18h', hours: 18, action: 'upgrade_offer', label: 'Trial expiring — upgrade offer' },
  { key: 'expired_24h', hours: 24, action: 'last_chance', label: 'Trial expired — last chance' },
];

function getSettings() {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM app_settings WHERE key IN ('site_name', 'site_url')").all();
  const s = {};
  for (const r of rows) s[r.key] = r.value;
  return s;
}

async function checkTrialLogin(username, password, serverUrl) {
  if (!username || !password || !serverUrl) return false;
  // Try multiple URL patterns for the player API
  const urls = [
    `${serverUrl}/player_api.php?username=${username}&password=${password}&action=user`,
    serverUrl.includes('://')
      ? `${serverUrl}/player_api.php?username=${username}&password=${password}&action=user`
      : `http://${serverUrl}/player_api.php?username=${username}&password=${password}&action=user`,
    `http://${serverUrl}/player_api.php?username=${username}&password=${password}&action=user`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const data = await res.json();
      if (data?.user_info) {
        // active_cons > 0 means they've logged in/watched
        const activeCons = parseInt(data.user_info.active_cons || '0');
        const isActive = data.user_info.status === 'Active';
        return activeCons > 0 || isActive;
      }
    } catch {}
  }
  return false;
}

async function sendMilestoneEmail(email, name, milestoneKey, trialInfo) {
  const s = getSettings();
  const siteName = s.site_name || 'Dalletek';
  const siteUrl = s.site_url || 'https://dalletek.live';
  const t = getTransporter();

  const templates = {
    no_login_6h: {
      subject: `⚡ ${name}, besoin d'aide pour configurer votre essai ?`,
      body: `
        <div style="text-align:center;padding:30px 20px;">
          <div style="font-size:48px;margin-bottom:12px;">🛠️</div>
          <h2 style="color:#00d4ff;font-size:22px;margin:0 0 8px;">Configuration en 30 secondes</h2>
          <p style="color:#a0a0a0;font-size:14px;margin:0 0 24px;">Votre essai ${siteName} est actif mais nous n'avons pas détecté de connexion. Voici comment commencer :</p>
        </div>
        <div style="background:#0f0f0f;border-radius:12px;padding:20px;margin-bottom:20px;">
          <div style="display:flex;gap:12px;margin-bottom:12px;">
            <div style="width:28px;height:28px;background:#00d4ff20;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:#00d4ff;font-size:13px;flex-shrink:0;">1</div>
            <div><span style="font-weight:600;">Téléchargez une app</span><br><span style="color:#666;font-size:12px;">TiviMate (Firestick), IPTV Smarters (Android/iOS), ou VLC (PC/Mac)</span></div>
          </div>
          <div style="display:flex;gap:12px;margin-bottom:12px;">
            <div style="width:28px;height:28px;background:#00d4ff20;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:#00d4ff;font-size:13px;flex-shrink:0;">2</div>
            <div><span style="font-weight:600;">Choisissez "Xtream Codes API"</span><br><span style="color:#666;font-size:12px;">Dans l'application, sélectionnez Xtream Codes comme méthode de connexion</span></div>
          </div>
          <div style="display:flex;gap:12px;">
            <div style="width:28px;height:28px;background:#00d4ff20;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:#00d4ff;font-size:13px;flex-shrink:0;">3</div>
            <div><span style="font-weight:600;">Entrez vos identifiants</span><br><span style="color:#666;font-size:12px;">Utilisez le Serveur, Nom d'utilisateur et Mot de passe reçus par email</span></div>
          </div>
        </div>
        <div style="text-align:center;">
          <a href="${siteUrl}/dashboard" style="display:inline-block;background:#00d4ff;color:#000;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">📋 Voir mes identifiants</a>
        </div>
        <p style="text-align:center;color:#666;font-size:13px;margin-top:20px;">Besoin d'aide ? Répondez à cet email ou cliquez sur le chat en bas à droite.</p>`,
    },
    expiring_18h: {
      subject: `⏳ ${name}, votre essai se termine bientôt !`,
      body: `
        <div style="text-align:center;padding:30px 20px;">
          <div style="font-size:48px;margin-bottom:12px;">⏳</div>
          <h2 style="color:#ffaa00;font-size:22px;margin:0 0 8px;">Votre essai expire dans quelques heures</h2>
          <p style="color:#a0a0a0;font-size:14px;margin:0 0 24px;">Ne perdez pas vos accès — passez à un forfait premium et continuez à regarder sans interruption.</p>
        </div>
        <div style="background:linear-gradient(135deg,#1a0a2e,#2a1a3e);border:2px solid #ff6b3530;border-radius:12px;padding:24px;text-align:center;margin-bottom:20px;">
          <h3 style="color:#ffd700;margin:0 0 4px;font-size:18px;">🎁 Offre spéciale : +1 mois gratuit</h3>
          <p style="color:#a0a0a0;font-size:13px;margin:0 0 16px;">Si vous passez premium avant la fin de votre essai, recevez un mois supplémentaire offert !</p>
          <a href="${siteUrl}/#plans" style="display:inline-block;background:linear-gradient(135deg,#ff6b35,#ff2d92);color:#fff;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">🚀 Voir les offres</a>
        </div>
        <div style="background:#0f0f0f;border-radius:12px;padding:16px;margin-bottom:20px;">
          <h4 style="margin:0 0 12px;font-size:14px;color:#a0a0a0;">Pourquoi passer premium ?</h4>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;">
            <div style="background:#1a1a1a;border-radius:8px;padding:10px;text-align:center;">📺 <strong>34 000+</strong><br><span style="color:#666;font-size:11px;">Chaînes live</span></div>
            <div style="background:#1a1a1a;border-radius:8px;padding:10px;text-align:center;">⚡ <strong>4K HDR</strong><br><span style="color:#666;font-size:11px;">Qualité ultra HD</span></div>
            <div style="background:#1a1a1a;border-radius:8px;padding:10px;text-align:center;">📡 <strong>4 écrans</strong><br><span style="color:#666;font-size:11px;">Multi-appareils</span></div>
            <div style="background:#1a1a1a;border-radius:8px;padding:10px;text-align:center;">💬 <strong>Support 24/7</strong><br><span style="color:#666;font-size:11px;">Assistance en direct</span></div>
          </div>
        </div>`,
    },
    expired_24h: {
      subject: `⏰ ${name}, votre essai a expiré — dernière chance !`,
      body: `
        <div style="text-align:center;padding:30px 20px;">
          <div style="font-size:48px;margin-bottom:12px;">⏰</div>
          <h2 style="color:#ff4444;font-size:22px;margin:0 0 8px;">Votre essai a expiré</h2>
          <p style="color:#a0a0a0;font-size:14px;margin:0 0 24px;">Mais il n'est pas trop tard ! Passez premium dans les 24h et bénéficiez d'un mois offert.</p>
        </div>
        <div style="background:linear-gradient(135deg,#1a0a0a,#2a1a1a);border:2px solid #ff444430;border-radius:12px;padding:24px;text-align:center;margin-bottom:20px;">
          <h3 style="color:#ff4444;margin:0 0 4px;font-size:18px;">🔥 Offre de dernière minute</h3>
          <p style="color:#ffd700;font-size:20px;font-weight:700;margin:8px 0;">+1 mois OFFERT</p>
          <p style="color:#a0a0a0;font-size:13px;margin:0 0 16px;">Si vous vous abonnez dans les 24 prochaines heures</p>
          <a href="${siteUrl}/#plans" style="display:inline-block;background:linear-gradient(135deg,#ff4444,#ff2d92);color:#fff;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">🔥 S'abonner maintenant</a>
        </div>
        <p style="text-align:center;color:#666;font-size:13px;margin-top:16px;">Cette offre expire dans 24h. Profitez-en !</p>`,
    },
  };

  const tpl = templates[milestoneKey];
  if (!tpl) return false;

  try {
    await t.sendMail({
      from: `"${siteName}" <${t.fromEmail}>`,
      to: email,
      subject: tpl.subject,
      html: `<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#0a0a0a;color:#fff;padding:20px;">
        <div style="max-width:560px;margin:0 auto;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#1a1a2e,#0a0a1a);padding:20px;text-align:center;">
            <span style="font-size:20px;color:#00d4ff;font-weight:700;">${siteName}</span>
          </div>
          ${tpl.body}
          <div style="text-align:center;padding:20px;border-top:1px solid #1a1a1a;color:#666;font-size:12px;">
            <p>${siteName} — <a href="${siteUrl}" style="color:#00d4ff;">${siteUrl}</a></p>
            <p>Pour vous désabonner de ces emails, répondez avec "STOP"</p>
          </div>
        </div>
      </div>`,
    });
    return true;
  } catch (e) {
    console.error(`Follow-up email error (${milestoneKey} to ${email}):`, e.message);
    return false;
  }
}

async function processFollowUps() {
  const db = getDb();
  const now = new Date().toISOString();
  const results = { checked: 0, loggedIn: 0, noLogin: 0, emailsSent: 0 };

  // Only process orders that were completed (active trials)
  const recentTrials = db.prepare(`
    SELECT o.*, tc.username, tc.password, tc.server_url, tc.duration_hours
    FROM orders o
    JOIN trial_codes tc ON tc.id = o.trial_code_id
    WHERE o.is_trial = 1 AND o.status = 'completed'
      AND o.created_at > datetime('now', '-30 hours')
    ORDER BY o.created_at DESC
  `).all();

  for (const trial of recentTrials) {
    results.checked++;
    const hoursSinceClaim = (Date.now() - new Date(trial.created_at).getTime()) / (1000 * 60 * 60);
    const trialDuration = trial.duration_hours || 24;

    // Determine the appropriate milestone
    let milestoneKey = null;

    // Check if user has logged in
    const hasLoggedIn = await checkTrialLogin(trial.username, trial.password, trial.server_url);
    if (hasLoggedIn) results.loggedIn++;
    else results.noLogin++;

    // 6h milestone: no login detected
    if (hoursSinceClaim >= 6 && hoursSinceClaim < 18 && !hasLoggedIn) {
      milestoneKey = 'no_login_6h';
    }
    // 18h milestone: trial expiring (regardless of login status)
    else if (hoursSinceClaim >= 18 && hoursSinceClaim < trialDuration) {
      milestoneKey = 'expiring_18h';
    }
    // Expired: past trial duration
    else if (hoursSinceClaim >= trialDuration) {
      milestoneKey = 'expired_24h';
    }

    if (milestoneKey) {
      // Check if we already sent this milestone email
      const alreadySent = db.prepare(`
        SELECT id FROM agent_log
        WHERE agent = 'FollowUp' AND order_id = ? AND details LIKE ?
      `).get(trial.id, `%${milestoneKey}%`);

      if (!alreadySent) {
        const sent = await sendMilestoneEmail(trial.customer_email, trial.customer_name, milestoneKey, trial);
        if (sent) {
          db.prepare(
            "INSERT INTO agent_log (agent, action, details, order_id, website_id) VALUES (?, ?, ?, ?, ?)"
          ).run('FollowUp', 'milestone_email', `${milestoneKey} sent to ${trial.customer_email}`, trial.id, trial.website_id || 1);
          results.emailsSent++;
        }
      }
    }
  }

  return results;
}

module.exports = { processFollowUps, checkTrialLogin };