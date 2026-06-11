const { getDb } = require('../db');
const { getTransporter } = require('./emailService');

const OUTREACH_TEMPLATES = {
  telegram_en: {
    greeting: "Hi {name}! 👋\n\nI saw you're looking for IPTV. I can offer you a free 24h trial to test our service — 34,000+ channels, 4K quality, all sports events.\n\nWant to try it? Just reply and I'll send your credentials instantly!",
    followUp: "Hey {name}, just checking in! Still interested in that free trial? 🎁\n\nWe have all World Cup 2026 matches in 4K. Test it free for 24h — no strings attached!",
    converted: "Awesome! Check your inbox for the setup guide. Your dashboard is ready at {dashboard_url}\n\nNeed help? Just ask! 🚀",
  },
  telegram_fr: {
    greeting: "Bonjour {name}! 👋\n\nJ'ai vu que vous cherchez un IPTV. Je vous offre un essai gratuit 24h pour tester notre service — 34 000+ chaînes, qualité 4K, tous les événements sportifs.\n\nVous voulez essayer ? Répondez-moi et je vous envoie vos identifiants !",
    followUp: "Salut {name}, des nouvelles ? L'essai gratuit vous intéresse toujours ? 🎁\n\nOn a tous les matchs de la Coupe du Monde 2026 en 4K. Testez gratuitement 24h !",
    converted: "Super ! Vérifiez votre boîte mail pour le guide d'installation. Votre tableau de bord est prêt : {dashboard_url}\n\nBesoin d'aide ? Je suis là ! 🚀",
  },
  telegram_ar: {
    greeting: "مرحبًا {name}! 👋\n\nرأيت أنك تبحث عن IPTV. يمكنني أن أقدم لك نسخة تجريبية مجانية لمدة 24 ساعة — أكثر من 34,000 قناة، جودة 4K، جميع الأحداث الرياضية.\n\nهل تريد التجربة؟ فقط رد وسأرسل لك بيانات الدخول فورًا!",
    followUp: "مرحبًا {name}، هل لا تزال مهتمًا بالنسخة التجريبية المجانية؟ 🎁\n\nلدينا جميع مباريات كأس العالم 2026 بجودة 4K. جرب مجانًا لمدة 24 ساعة!",
    converted: "رائع! تحقق من بريدك الإلكتروني للحصول على دليل الإعداد. لوحة التحكم الخاصة بك جاهزة: {dashboard_url}\n\nتحتاج مساعدة؟ أنا هنا! 🚀",
  },
  email_en: {
    greeting: "Hi {name},\n\nI noticed you've been looking for an IPTV service. We offer a free 24h trial with access to 34,000+ channels in 4K quality.\n\n👉 Claim your free trial: {trial_url}\n\nYour credentials will be delivered instantly after claiming. No credit card needed.\n\nBest,\nAlex from {site_name}",
    followUp: "Hey {name},\n\nJust a quick follow-up — your free 24h trial is still waiting! 🎁\n\nWatch all World Cup 2026 matches, Premier League, NBA, and more in 4K.\n\n👉 {trial_url}\n\nAny questions? Just reply to this email!\n\nAlex",
  },
  email_fr: {
    greeting: "Bonjour {name},\n\nJ'ai vu que vous cherchez un service IPTV. Nous offrons un essai gratuit de 24h avec accès à 34 000+ chaînes en qualité 4K.\n\n👉 Réclamez votre essai gratuit : {trial_url}\n\nVos identifiants seront livrés instantanément. Aucune carte bancaire nécessaire.\n\nCordialement,\nAlex de {site_name}",
    followUp: "Salut {name},\n\nPetit rappel — votre essai gratuit 24h vous attend toujours ! 🎁\n\nRegardez tous les matchs de la Coupe du Monde 2026, Premier League, NBA, et plus en 4K.\n\n👉 {trial_url}\n\nDes questions ? Répondez à cet email !\n\nAlex",
  },
};

function getSettings() {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM app_settings WHERE key IN ('site_name', 'site_url')").all();
  const s = {};
  for (const r of rows) s[r.key] = r.value;
  s.site_name ||= 'Dalletek';
  s.site_url ||= 'https://dalletek.live';
  return s;
}

function detectLanguage(text) {
  if (!text) return 'en';
  const arabic = /[\u0600-\u06FF]/;
  const french = /[éèêëàâîïôûùçœæ]/i;
  if (arabic.test(text)) return 'ar';
  if (french.test(text)) return 'fr';
  return 'en';
}

async function sendTelegramDM(botToken, username, message) {
  if (!botToken || !username) return false;
  const cleanUser = username.replace('@', '');
  try {
    const axios = require('axios');
    const res = await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: `@${cleanUser}`,
      text: message,
      parse_mode: 'HTML',
    }, { timeout: 15000 });
    return res.data?.ok || false;
  } catch (e) {
    // User might not have started the bot — that's expected
    return false;
  }
}

async function sendOutreachEmail(email, subject, htmlBody) {
  try {
    const t = getTransporter();
    const s = getSettings();
    const fullHtml = `<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#0a0a0a;color:#fff;padding:20px;">
      <div style="max-width:560px;margin:0 auto;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:16px;padding:24px;">
        ${htmlBody}
        <div style="text-align:center;margin-top:24px;color:#666;font-size:12px;border-top:1px solid #1a1a1a;padding-top:16px;">
          <p>${s.site_name} — <a href="${s.site_url}" style="color:#00d4ff;">${s.site_url}</a></p>
        </div>
      </div>
    </div>`;
    await t.sendMail({
      from: `"${s.site_name}" <${t.fromEmail}>`,
      to: email,
      subject,
      html: fullHtml,
    });
    return true;
  } catch (e) {
    console.error('Outreach email error:', e.message);
    return false;
  }
}

function getTemplate(lang, channel, type) {
  const key = `${channel}_${lang}`;
  const fallback = `${channel}_en`;
  return OUTREACH_TEMPLATES[key]?.[type] || OUTREACH_TEMPLATES[fallback]?.[type] || '';
}

function fillTemplate(tpl, vars) {
  let result = tpl;
  for (const [k, v] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v || ''));
  }
  return result;
}

async function processOutreach() {
  const db = getDb();
  const s = getSettings();
  const botToken = (db.prepare("SELECT value FROM app_settings WHERE key = 'telegram_bot_token'").get() || {}).value || '';
  const trialUrl = `${s.site_url}/`;
  const dashboardUrl = `${s.site_url}/dashboard`;

  // Get leads that haven't been contacted yet
  const leads = db.prepare(`
    SELECT id, source, author, lead_contact, email, phone, content, intent_score, language, status
    FROM demand_signals
    WHERE intent_score >= 50 AND status IN ('new', 'validated')
      AND (lead_contact != '' OR email != '' OR phone != '' OR author != '')
    ORDER BY intent_score DESC
    LIMIT 20
  `).all();

  const results = { checked: 0, telegramDMs: 0, emails: 0, skipped: 0, errors: 0 };

  for (const lead of leads) {
    results.checked++;
    const lang = lead.language || detectLanguage(lead.content || '');
    const name = lead.author?.replace(/@/g, '').substring(0, 20) || 'there';

    // Check if already contacted recently
    const alreadyContacted = db.prepare(`
      SELECT id FROM agent_log WHERE agent = 'Outreach' AND (details LIKE ? OR details LIKE ?) AND created_at > datetime('now', '-7 days')
    `).get(`%${lead.email || lead.lead_contact || lead.author}%`, `%${lead.id}%`);
    if (alreadyContacted) { results.skipped++; continue; }

    let sent = false;

    // Try Telegram DM first (if we have a bot and the lead has a handle)
    if (botToken && (lead.lead_contact || lead.author)) {
      const handle = (lead.lead_contact || lead.author || '').replace(/^@/, '');
      if (handle && !handle.includes('.')) {
        const greeting = fillTemplate(getTemplate(lang, 'telegram', 'greeting'), { name, dashboard_url: dashboardUrl, trial_url: trialUrl, site_name: s.site_name });
        sent = await sendTelegramDM(botToken, `@${handle}`, greeting);
        if (sent) {
          db.prepare(
            "INSERT INTO agent_log (agent, action, details) VALUES (?, ?, ?)"
          ).run('Outreach', 'telegram_dm', `TG DM sent to @${handle} (lead #${lead.id}): ${greeting.substring(0, 80)}`);
          results.telegramDMs++;
        }
      }
    }

    // Try email if Telegram failed and we have an email
    if (!sent && lead.email && lead.email.includes('@')) {
      const greeting = fillTemplate(getTemplate(lang, 'email', 'greeting'), { name, dashboard_url: dashboardUrl, trial_url: trialUrl, site_name: s.site_name });
      sent = await sendOutreachEmail(lead.email, `${s.site_name} — Free trial waiting for you! 🎁`, greeting.replace(/\n/g, '<br>'));
      if (sent) {
        db.prepare(
          "INSERT INTO agent_log (agent, action, details) VALUES (?, ?, ?)"
        ).run('Outreach', 'email_sent', `Email sent to ${lead.email} (lead #${lead.id})`);
        results.emails++;
      }
    }

    if (sent) {
      db.prepare("UPDATE demand_signals SET status = 'contacted' WHERE id = ?").run(lead.id);
    } else {
      results.errors++;
    }

    // Rate limit: wait 2-5 seconds between sends
    if (sent) await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));
  }

  return results;
}

module.exports = { processOutreach };