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
    const html = renderTemplate(bodyHtml);
    const sent = await sendWithFallback({
      method: () => t.sendMail({ from: `"${t.fromName}" <${t.fromEmail}>`, to: email, subject, html }),
      to: email, name, subject, html,
    });
    if (sent) trackSend();
    return sent;
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
    const html = renderTemplate(body);
    const sent = await sendWithFallback({
      method: () => t.sendMail({ from: `"${t.fromName}" <${t.fromEmail}>`, to: email, subject: 'Payment confirmed!', html }),
      to: email, name, subject: 'Payment confirmed!', html,
    });
    if (sent) trackSend();
    return sent;
  } catch (e) {
    console.error('sendThankYou error:', e);
    return false;
  }
}

async function sendCredentials({ email, name, credentials, providerName, planName }) {
  try {
    const t = getTransporter();
    const { getDb } = require('../db');
    const db = getDb();
    const siteUrl = (db.prepare("SELECT value FROM app_settings WHERE key = 'site_url'").get() || {}).value || process.env.SITE_URL || 'http://localhost:3000';
    const siteName = (db.prepare("SELECT value FROM app_settings WHERE key = 'site_name'").get() || {}).value || process.env.SITE_NAME || 'Dalletek';
    const m3uUrl = credentials.server_url
      ? `${credentials.server_url}/get.php?username=${encodeURIComponent(credentials.username)}&password=${encodeURIComponent(credentials.password)}&type=m3u_plus&output=ts`
      : null;
    const tpl = renderEmailTemplate('credentials_default', {
      customer_name: name, customer_email: email,
      username: credentials.username, password: credentials.password,
      server_url: credentials.server_url, code: credentials.code,
      provider_name: providerName, plan_name: planName,
      site_name: siteName, site_url: siteUrl,
      m3u_url: m3uUrl || '',
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
    const subject = (tpl ? tpl.subject : 'Your IPTV activation credentials');
    const html = renderTemplate(bodyHtml);
    const sent = await sendWithFallback({
      method: () => t.sendMail({ from: `"${t.fromName}" <${t.fromEmail}>`, to: email, subject, html }),
      to: email, name, subject, html,
    });
    if (sent) trackSend();
    return sent;
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

    const appSteps = (app.steps || '').split('\n').join('<br>');

    // Try DB template first
    const tpl = renderEmailTemplate('trial_default', {
      customer_name: name || 'là', customer_email: email,
      username: credentials.username, password: credentials.password,
      server_url: credentials.server_url,
      duration_hours: String(durationHours || 24),
      site_name: siteName, site_url: siteUrl,
      provider_name: providerName, plan_name: planName,
      m3u_url: m3uUrl || '',
      dashboard_url: dashboardUrl,
      app_name: app.name,
      app_logo: app.logo,
      app_steps: appSteps,
    });

    const bodyHtml = tpl ? tpl.body : `
      <div style="text-align:center;padding:12px 0 20px;">
        <div style="background:linear-gradient(135deg,#00d4ff,#0066ff);width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:32px;">📺</div>
        <h1 style="color:#fff;font-size:26px;margin:0 0 6px;letter-spacing:-0.5px;">Bienvenue sur {{site_name}} !</h1>
        <p style="color:#888;font-size:14px;margin:0;">Votre essai gratuit de {{duration_hours}}h est actif</p>
      </div>
      <div style="background:linear-gradient(135deg,#0a1628,#002a4a);border:1px solid #00d4ff20;border-radius:14px;padding:24px;margin-bottom:24px;text-align:center;">
        <div style="font-size:16px;margin-bottom:6px;color:#666;">⏱️ Temps restant</div>
        <div style="font-size:42px;font-weight:800;background:linear-gradient(135deg,#00d4ff,#66aaff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">{{duration_hours}}h</div>
        <p style="color:#555;font-size:12px;margin:8px 0 0;">L'essai démarre dès votre première connexion sur le serveur</p>
      </div>
      <div style="background:#111;border:1px solid #222;border-radius:14px;padding:24px;margin-bottom:20px;">
        <h3 style="color:#00d4ff;margin:0 0 16px;font-size:16px;">🔑 Identifiants de connexion</h3>
        <div style="background:#0a0a0a;border-radius:10px;padding:16px;font-family:monospace;">
          {{#if server_url}}<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #1a1a1a;"><span style="color:#555;font-size:12px;">SERVEUR</span><span style="color:#fff;font-size:13px;word-break:break-all;text-align:right;max-width:280px;">{{server_url}}</span></div>{{/if}}
          {{#if username}}<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #1a1a1a;"><span style="color:#555;font-size:12px;">IDENTIFIANT</span><span style="color:#00d4ff;font-size:14px;font-weight:600;">{{username}}</span></div>{{/if}}
          {{#if password}}<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #1a1a1a;"><span style="color:#555;font-size:12px;">MOT DE PASSE</span><span style="color:#66ff66;font-size:14px;font-weight:600;">{{password}}</span></div>{{/if}}
          {{#if m3u_url}}<div style="padding:8px 0 0;"><span style="color:#555;font-size:12px;display:block;margin-bottom:8px;">LIEN M3U (pour IPTV Smarters, GSE, VLC)</span><div style="background:#000;border:1px solid #333;border-radius:8px;padding:12px;font-size:11px;color:#aaa;word-break:break-all;line-height:1.6;">{{m3u_url}}</div></div>{{/if}}
        </div>
      </div>
      {{#if app_name}}<div style="background:#111;border:1px solid #222;border-radius:14px;padding:24px;margin-bottom:20px;">
        <h3 style="color:#8b5cf6;margin:0 0 16px;font-size:16px;">{{app_logo}} {{app_name}} — Configuration</h3>
        <div style="background:#0a0a0a;border-radius:10px;padding:16px;color:#ccc;font-size:12px;line-height:2;font-family:monospace;">{{app_steps}}</div>
      </div>{{/if}}
      <div style="background:linear-gradient(135deg,#1a1a2e,#0a0a1a);border:1px solid #8b5cf630;border-radius:14px;padding:24px;margin-bottom:20px;">
        <h3 style="color:#8b5cf6;margin:0 0 16px;font-size:16px;">👤 Votre compte client</h3>
        <div style="background:#0a0a0a;border-radius:10px;padding:16px;">
          <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:13px;"><span style="color:#555;">Email</span><span style="color:#fff;">{{customer_email}}</span></div>
        </div>
        <div style="text-align:center;margin-top:16px;">
          <a href="{{dashboard_url}}" style="display:inline-block;background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:#fff;padding:12px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">📊 Accéder au tableau de bord</a>
        </div>
        <p style="color:#555;font-size:12px;text-align:center;margin:12px 0 0;">Suivez votre essai, configurez vos appareils et passez à l'offre premium</p>
      </div>
      <div style="background:linear-gradient(135deg,#ff6b3520,#ff2d9220);border:1px solid #ff6b3540;border-radius:14px;padding:24px;text-align:center;margin-bottom:16px;">
        <h3 style="color:#fff;margin:0 0 8px;font-size:18px;">🚀 Passez à l'offre Premium</h3>
        <p style="color:#aaa;font-size:13px;margin:0 0 16px;">+25 000 chaînes • 4K HDR • Sport en direct • VOD illimitée</p>
        <a href="{{site_url}}/#plans" style="display:inline-block;background:linear-gradient(135deg,#ff6b35,#ff2d92);color:#fff;padding:14px 44px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;box-shadow:0 4px 20px #ff2d9240;">🔥 Voir les offres</a>
        <p style="color:#555;font-size:12px;margin:14px 0 0;">💳 Paiement 100% sécurisé • 🔒 Données protégées • 🎧 Support 24/7</p>
      </div>
      <div style="background:#111;border:1px solid #222;border-radius:14px;padding:20px;margin-bottom:20px;">
        <h3 style="color:#666;margin:0 0 12px;font-size:13px;">📱 BESOIN D'AIDE ?</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
          <a href="{{dashboard_url}}" style="display:inline-block;background:#1a1a1a;color:#aaa;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:13px;">📖 Guide d'installation</a>
          <a href="{{site_url}}/support" style="display:inline-block;background:#1a1a1a;color:#aaa;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:13px;">🎧 Support client</a>
        </div>
      </div>`;

    const subject = tpl ? tpl.subject : `🎬 {{site_name}} — Votre essai gratuit {{duration_hours}}h est actif !`;
    const html = renderTemplate(bodyHtml);
    const sent = await sendWithFallback({
      method: () => t.sendMail({ from: `"${siteName}" <${t.fromEmail}>`, to: email, subject, html }),
      to: email, name, subject, html,
    });
    if (sent) trackSend();
    return sent;
  } catch (e) {
    console.error('sendTrial error:', e);
    return false;
  }
}

async function sendRaw({ to, subject, html }) {
  try {
    const t = getTransporter();
    if (!t) return false;
    await t.sendMail({
      from: `"${t.fromName}" <${t.fromEmail}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (e) {
    console.error('sendRaw error:', e);
    return false;
  }
}

// SendGrid fallback via API
async function sendViaSendGrid(to, name, subject, html) {
  const { getDb } = require('../db');
  const db = getDb();
  const apiKey = (db.prepare("SELECT value FROM app_settings WHERE key = 'sendgrid_api_key'").get() || {}).value;
  if (!apiKey) throw new Error('SendGrid not configured');

  const fromEmail = (db.prepare("SELECT value FROM app_settings WHERE key = 'smtp_from_email'").get() || {}).value || 'support@dalletek.live';
  const fromName = (db.prepare("SELECT value FROM app_settings WHERE key = 'smtp_from_name'").get() || {}).value || 'Dalletek';

  const body = {
    personalizations: [{ to: [{ email: to, name: name || '' }] }],
    from: { email: fromEmail, name: fromName },
    subject,
    content: [{ type: 'text/html', value: html }],
    tracking_settings: { click_tracking: { enable: true }, open_tracking: { enable: true } },
  };

  const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`SendGrid API returned ${resp.status}: ${text.substring(0, 200)}`);
  }
  return true;
}

// Fallback wrapper: try SMTP first, then SendGrid
async function sendWithFallback({ method, to, subject, html, name }) {
  try {
    const success = await method();
    if (success) return true;
  } catch (e) {
    console.error(`[Email] SMTP failed (${e.message}), trying SendGrid...`);
  }
  try {
    await sendViaSendGrid(to, name || '', subject, html);
    return true;
  } catch (e2) {
    console.error(`[Email] SendGrid also failed: ${e2.message}`);
    return false;
  }
}

// Check email service availability — tests both providers
async function checkEmailHealth() {
  const { getDb } = require('../db');
  const db = getDb();
  const result = { smtp: 'unknown', sendgrid: 'unknown', sendgrid_remaining: null, ok: false };

  // Test SMTP by creating a transport and verifying
  try {
    const t = getTransporter();
    if (t && t.verify) {
      await t.verify();
      result.smtp = 'ok';
    } else {
      result.smtp = 'no_auth';
    }
  } catch (e) {
    result.smtp = `error: ${e.message}`;
  }

  // Test SendGrid via API
  try {
    const apiKey = (db.prepare("SELECT value FROM app_settings WHERE key = 'sendgrid_api_key'").get() || {}).value;
    if (apiKey) {
      const resp = await fetch('https://api.sendgrid.com/v3/user/credits', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        result.sendgrid = 'ok';
        result.sendgrid_remaining = data.remain || 0;
        // Alert if SendGrid is running low
        if (data.remain !== undefined && data.remain < 20) {
          result.sendgrid = `low (${data.remain} remaining)`;
        }
      } else {
        result.sendgrid = `api_error (${resp.status})`;
      }
    } else {
      result.sendgrid = 'not_configured';
    }
  } catch (e) {
    result.sendgrid = `error: ${e.message}`;
  }

  result.ok = result.smtp === 'ok' || result.sendgrid === 'ok';

  // Log to agent_log if both are down
  if (!result.ok) {
    try {
      db.prepare("INSERT INTO agent_log (agent, action, details) VALUES (?, ?, ?)").run(
        'EmailHealth', 'alert', `Both email providers down — SMTP: ${result.smtp}, SendGrid: ${result.sendgrid}`
      );
    } catch {}
  }

  return result;
}

// Track email send attempt in daily counter
function trackSend() {
  try {
    const { getDb } = require('../db');
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    const row = db.prepare("SELECT value FROM app_settings WHERE key = 'email_sent_today'").get();
    let count = row ? parseInt(row.value || '0') : 0;
    db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)").run('email_sent_today', String(count + 1));
    db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)").run('email_sent_date', today);
    // Alert if sending more than 250 in a day (Brevo free limit is 300)
    if (count + 1 >= 250) {
      db.prepare("INSERT INTO agent_log (agent, action, details) VALUES (?, ?, ?)").run(
        'EmailHealth', 'quota_warning', `${count + 1} emails sent today — approaching Brevo limit of 300`
      );
    }
  } catch {}
}

module.exports = { sendPaymentLink, sendThankYou, sendCredentials, sendTrial, sendStockAlert, sendRaw, getTransporter, sendViaSendGrid, sendWithFallback, checkEmailHealth, trackSend };
