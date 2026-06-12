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

const APP_SETUP = {
  tivimate: { name: 'TiviMate', logo: '🔥', steps: '1. Installez TiviMate depuis le Google Play Store\n2. Ouvrez TiviMate → Paramètres → Playlist\n3. Choisissez "Xtream Codes API"\n4. Entrez les identifiants ci-dessus\n5. Validez et profitez !' },
  smarters: { name: 'IPTV Smarters Pro', logo: '📡', steps: '1. Installez IPTV Smarters Pro\n2. Ouvrez l\'app → "Login with Xtream Codes API"\n3. Entrez les identifiants ci-dessus\n4. Choisissez votre nom de connexion\n5. Commencez à regarder !' },
  gse: { name: 'GSE Smart IPTV', logo: '🍎', steps: '1. Installez GSE Smart IPTV depuis l\'App Store\n2. Ouvrez → Remote URLs\n3. Ajoutez le lien M3U ci-dessus\n4. Les chaînes apparaîtront dans votre liste' },
  vlc: { name: 'VLC', logo: '📹', steps: '1. Installez VLC\n2. Ouvrez → Network Stream\n3. Collez le lien M3U ci-dessus\n4. Zappez entre les chaînes !' },
  iptvx: { name: 'IPTVX', logo: '📱', steps: '1. Installez IPTVX depuis l\'App Store\n2. Ouvrez → Add Playlist → M3U URL\n3. Collez le lien M3U ci-dessus\n4. Profitez sur tous vos appareils Apple !' },
  mag: { name: 'MAG Box', logo: '📦', steps: '1. Allez dans Paramètres → Serveurs → Portal URL\n2. Entrez l\'URL du Portail ci-dessus (en jaune)\n3. Redémarrez la box\n4. Les chaînes s\'afficheront au démarrage' },
  formuler: { name: 'Formuler (MyTVOnline)', logo: '📺', steps: '1. Ouvrez l\'application MyTVOnline 2\n2. Appuyez sur le bouton MENU de la télécommande\n3. Allez dans Paramètres → Portail\n4. Entrez l\'URL du Portail ci-dessus (en jaune)\n5. Redémarrez l\'application' },
  enigma: { name: 'Enigma2', logo: '🛜', steps: '1. Allez dans Menu → Plugins → TSpanel ou utilisez une connexion FTP\n2. Ouvrez le dossier /etc/enigma2/\n3. Ajoutez le lien M3U ci-dessus dans votre bouquets list\n4. Redémarrez E2 via Menu → Standby/ Restart\n5. Les chaînes apparaîtront dans votre bouquet utilisateur' },
  default: { name: 'Votre appareil', logo: '📱', steps: '1. Téléchargez une application IPTV (TiviMate, IPTV Smarters, VLC)\n2. Choisissez "Xtream Codes API" ou "M3U URL"\n3. Entrez les identifiants ci-dessus ou utilisez le lien M3U\n4. Profitez de vos chaînes !' },
};

async function sendTrial({ email, name, credentials, durationHours, providerName, planName, accountPassword, preferredApp }) {
  try {
    const t = getTransporter();
    const { getDb } = require('../db');
    const db = getDb();
    const siteUrl = (db.prepare("SELECT value FROM app_settings WHERE key = 'site_url'").get() || {}).value || process.env.SITE_URL || 'http://localhost:3000';
    const siteName = (db.prepare("SELECT value FROM app_settings WHERE key = 'site_name'").get() || {}).value || process.env.SITE_NAME || 'Dalletek';
    const dashboardUrl = `${siteUrl}/dashboard`;

    const portalApps = ['mag', 'formuler'];
    const needsPortal = portalApps.includes(preferredApp);

    const m3uUrl = credentials.server_url
      ? `${credentials.server_url}/get.php?username=${encodeURIComponent(credentials.username)}&password=${encodeURIComponent(credentials.password)}&type=m3u_plus&output=ts`
      : null;

    const portalUrl = credentials.server_url
      ? `${credentials.server_url}/c/`
      : null;

    const app = APP_SETUP[preferredApp] || APP_SETUP.default;

    const bodyHtml = `
      <div style="text-align:center;padding:20px 0;">
        <div style="font-size:48px;margin-bottom:8px;">📺</div>
        <h1 style="color:#00d4ff;font-size:24px;margin:0 0 4px;">Bienvenue sur ${siteName} !</h1>
        <p style="color:#a0a0a0;font-size:14px;margin:0 0 20px;">Votre essai gratuit de ${durationHours || 24}h est actif</p>
      </div>

      <div style="background:linear-gradient(135deg,#0a1628,#1a1a2e);border:2px solid #00d4ff30;border-radius:12px;padding:20px;margin-bottom:20px;text-align:center;">
        <div style="font-size:36px;margin-bottom:4px;">⏱️</div>
        <p style="color:#a0a0a0;font-size:13px;margin:0 0 8px;">Votre essai expire dans</p>
        <div style="font-size:28px;font-weight:800;color:#00d4ff;">${durationHours || 24}h</div>
      </div>

      <div style="background:#0f0f0f;border-radius:12px;padding:20px;margin-bottom:20px;">
        <h3 style="color:#00d4ff;margin:0 0 12px;font-size:15px;">🔑 Identifiants IPTV</h3>
        ${credentials.server_url ? '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #1a1a1a;font-size:13px;"><span style="color:#666;">Serveur</span><span style="color:#fff;font-family:monospace;">' + credentials.server_url + '</span></div>' : ''}
        ${credentials.username ? '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #1a1a1a;font-size:13px;"><span style="color:#666;">Identifiant</span><span style="color:#fff;font-family:monospace;">' + credentials.username + '</span></div>' : ''}
        ${credentials.password ? '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #1a1a1a;font-size:13px;"><span style="color:#666;">Mot de passe</span><span style="color:#fff;font-family:monospace;">' + credentials.password + '</span></div>' : ''}
        ${!needsPortal && m3uUrl ? '<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;"><span style="color:#666;">Lien M3U</span><span style="color:#a0a0a0;font-size:11px;word-break:break-all;max-width:300px;text-align:right;">' + m3uUrl + '</span></div>' : ''}
        ${needsPortal && portalUrl ? '<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;"><span style="color:#666;">URL Portail</span><span style="color:#ffd700;font-size:11px;word-break:break-all;max-width:300px;text-align:right;font-family:monospace;">' + portalUrl + '</span></div>' : ''}
      </div>

      <div style="background:#0f0f0f;border-radius:12px;padding:20px;margin-bottom:20px;">
        <h3 style="color:#8b5cf6;margin:0 0 12px;font-size:15px;">' + app.logo + ' ' + app.name + ' — Configuration</h3>
        <pre style="color:#a0a0a0;font-size:12px;line-height:1.8;white-space:pre-wrap;font-family:monospace;margin:0;">${app.steps}</pre>
      </div>

      <div style="background:linear-gradient(135deg,#1a1a2e,#0a0a1a);border:1px solid #8b5cf630;border-radius:12px;padding:20px;margin-bottom:20px;">
        <h3 style="color:#8b5cf6;margin:0 0 12px;font-size:15px;">👤 Votre Compte</h3>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #1a1a1a;font-size:13px;"><span style="color:#666;">Email</span><span style="color:#fff;">${email}</span></div>
        ${accountPassword ? '<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;"><span style="color:#666;">Mot de passe</span><span style="color:#ffd700;font-family:monospace;">' + accountPassword + '</span></div>' : ''}
        <div style="text-align:center;margin-top:14px;">
          <a href="${dashboardUrl}" style="display:inline-block;background:#8b5cf6;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;">📊 Mon Tableau de Bord</a>
        </div>
        <p style="color:#666;font-size:12px;text-align:center;margin:8px 0 0;">Connectez-vous pour voir votre compte à rebours, configurer votre appareil et passer premium</p>
      </div>

      <div style="text-align:center;margin-bottom:20px;">
        <a href="${siteUrl}/#plans" style="display:inline-block;background:linear-gradient(135deg,#ff6b35,#ff2d92);color:#fff;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">🚀 Voir les Offres Premium</a>
        <p style="color:#666;font-size:12px;margin-top:10px;">💳 Paiement 100% sécurisé • Support 24/7</p>
      </div>`;

    const subject = `🎬 ${siteName} — Votre essai gratuit ${durationHours || 24}h est actif !`;
    await t.sendMail({
      from: `"${siteName}" <${t.fromEmail}>`,
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
