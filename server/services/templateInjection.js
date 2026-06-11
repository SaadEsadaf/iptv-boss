const { getDb } = require('../db')
const { titan } = require('./titanHub')
const { renderEmailTemplate, getTransporter } = require('./emailService')

function ensureContentQueueTable() {
  const db = getDb()
  db.exec(`CREATE TABLE IF NOT EXISTS titan_content_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id TEXT,
    template_id INTEGER,
    template_type TEXT NOT NULL,
    content TEXT NOT NULL,
    target_platform TEXT,
    status TEXT DEFAULT 'pending',
    posted INTEGER DEFAULT 0,
    posted_at TEXT,
    language TEXT DEFAULT 'en',
    cta_url TEXT,
    metadata TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`)
  db.exec(`CREATE TABLE IF NOT EXISTS titan_injection_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER,
    injection_type TEXT NOT NULL,
    target TEXT,
    result TEXT,
    ref_id INTEGER,
    status TEXT DEFAULT 'success',
    error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`)
}

ensureContentQueueTable()

async function injectNow(templateId, target) {
  const db = getDb()
  const template = db.prepare('SELECT * FROM titan_templates WHERE id = ?').get(templateId)
  if (!template) throw new Error('Template not found')

  const result = { templateId, type: template.type, target, actions: [] }
  const type = target || template.type

  const siteName = (db.prepare("SELECT value FROM app_settings WHERE key = 'site_name'").get() || {}).value || 'Dalletek'
  const siteUrl = (db.prepare("SELECT value FROM app_settings WHERE key = 'site_url'").get() || {}).value || 'http://localhost:3001'

  const vars = {
    site_name: siteName,
    site_url: siteUrl,
    trial_url: `${siteUrl}/#trial`,
    plans_url: `${siteUrl}/#plans`,
    support_email: (db.prepare("SELECT value FROM app_settings WHERE key = 'support_email'").get() || {}).value || 'support@dalletek.live',
  }

  let content = template.content
  for (const [k, v] of Object.entries(vars)) {
    content = content.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v)
  }

  if (type === 'landing_page') {
    const slug = slugify(template.name)
    const existing = db.prepare('SELECT id FROM landing_pages WHERE slug = ?').get(slug)
    if (existing) {
      result.actions.push({ type: 'landing_page', status: 'skipped', reason: 'Slug already exists', slug })
    } else {
      const html = buildLandingPageHtml(content, template.name, siteName)
      const ins = db.prepare(`
        INSERT INTO landing_pages (title, slug, keyword, audience, html_content, language, active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).run(template.name, slug, template.name, 'iptv', html, 'fr')
      logInjection(template.id, 'landing_page', slug, ins.lastInsertRowid)
      result.actions.push({ type: 'landing_page', status: 'created', slug, id: ins.lastInsertRowid, url: `/lp/${slug}` })
    }
  }

  if (type === 'email_sequence') {
    let emailData
    try { emailData = JSON.parse(content) } catch { emailData = { subject: `Special offer from ${siteName}`, body: content } }
    const leads = db.prepare(`
      SELECT id, email, author as name, source, language
      FROM demand_signals
      WHERE email != '' AND email IS NOT NULL AND status != 'dismissed'
      ORDER BY intent_score DESC
    `).all()
    const now = new Date()
    let queued = 0
    for (const lead of leads.slice(0, 50)) {
      const rendered = emailData.body
        .replace(/\{\{name\}\}/g, lead.name || lead.email.split('@')[0])
        .replace(/\{\{email\}\}/g, lead.email)
        .replace(/\{\{site_name\}\}/g, siteName)
        .replace(/\{\{site_url\}\}/g, siteUrl)
      const subject = (emailData.subject || 'Special offer')
        .replace(/\{\{name\}\}/g, lead.name || lead.email.split('@')[0])
        .replace(/\{\{site_name\}\}/g, siteName)
      db.prepare(`
        INSERT INTO email_queue (lead_email, lead_name, sequence_type, template_index, scheduled_at, status, lead_id, source, language, extra_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        lead.email, lead.name || '', `campaign_${template.id}`, 0,
        new Date(now.getTime() + 60000).toISOString().replace('T', ' ').split('.')[0],
        'pending', lead.id, lead.source, lead.language || 'en',
        JSON.stringify({ subject, template_id: template.id })
      )
      queued++
    }
    logInjection(template.id, 'email_sequence', `${queued} leads`, queued)
    result.actions.push({ type: 'email_sequence', queued, totalLeads: leads.length })
  }

  if (type === 'social_post') {
    try {
      const postData = JSON.parse(content)
      const platforms = ['telegram', 'reddit', 'twitter']
      for (const platform of platforms) {
        const postContent = [
          postData.headline || template.name,
          postData.body || content,
          postData.hashtags || '#IPTV #WorldCup2026 #Dalletek',
          postData.cta || `👉 ${siteUrl}/#trial`,
        ].join('\n\n')
        db.prepare(`
          INSERT INTO titan_content_queue (template_id, template_type, content, target_platform, status, cta_url, language)
          VALUES (?, ?, ?, ?, 'pending', ?, 'fr')
        `).run(template.id, 'social_post', postContent, platform, `${siteUrl}/#trial`)
      }
      result.actions.push({ type: 'social_post', queued: 3, platforms })
    } catch {
      db.prepare(`
        INSERT INTO titan_content_queue (template_id, template_type, content, target_platform, status, cta_url, language)
        VALUES (?, ?, ?, ?, 'pending', ?, 'fr')
      `).run(template.id, 'social_post', content, 'telegram', `${siteUrl}/#trial`)
      result.actions.push({ type: 'social_post', queued: 1 })
    }
    logInjection(template.id, 'social_post', 'queued', template.id)
  }

  if (type === 'chat_response') {
    try {
      const chatData = JSON.parse(content)
      const knowledgeEntry = Object.entries(chatData).map(([key, val]) => `${key}: ${val}`).join('\n')
      const kb = require('../data/iptvKnowledge')
      if (kb.addKnowledgeEntry) {
        kb.addKnowledgeEntry(template.name, knowledgeEntry, 'Titan Injection')
      }
      result.actions.push({ type: 'chat_response', status: 'injected', keys: Object.keys(chatData) })
    } catch {
      result.actions.push({ type: 'chat_response', status: 'skipped', reason: 'Could not parse chat data' })
    }
    logInjection(template.id, 'chat_response', 'injected', template.id)
  }

  if (type === 'whatsapp_message') {
    const whatsappNumber = (db.prepare("SELECT value FROM app_settings WHERE key = 'whatsapp_number'").get() || {}).value || ''
    let msgText = content
    try {
      const msgData = JSON.parse(content)
      msgText = [msgData.greeting, msgData.offer, msgData.cta, msgData.signature].filter(Boolean).join('\n\n')
    } catch {}
    db.prepare(`
      INSERT INTO titan_content_queue (template_id, template_type, content, target_platform, status, cta_url, language)
      VALUES (?, ?, ?, ?, 'pending', ?, 'fr')
    `).run(template.id, 'whatsapp_message', msgText, 'whatsapp', `${siteUrl}/#trial`)
    result.actions.push({ type: 'whatsapp_message', queued: 1, number: whatsappNumber || 'not configured' })
    logInjection(template.id, 'whatsapp_message', 'queued', template.id)
  }

  if (type === 'ad_copy') {
    db.prepare(`
      INSERT INTO titan_content_queue (template_id, template_type, content, target_platform, status, cta_url, language)
      VALUES (?, ?, ?, ?, 'pending', ?, 'fr')
    `).run(template.id, 'ad_copy', content, 'all', `${siteUrl}/#trial`)
    result.actions.push({ type: 'ad_copy', queued: 1 })
    logInjection(template.id, 'ad_copy', 'queued', template.id)
  }

  // Mark template as active after successful injection
  db.prepare('UPDATE titan_templates SET active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(template.id)

  // Log the injection to titan_injections for tracking
  const existingInjections = db.prepare('SELECT id FROM titan_injections WHERE template_id = ?').get(templateId)
  if (!existingInjections) {
    db.prepare('INSERT INTO titan_injections (template_id, target, position, conditions) VALUES (?, ?, ?, ?)').run(templateId, type, 'append', '{}')
  }

  return result
}

function buildLandingPageHtml(content, title, siteName) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — ${siteName}</title>
<meta name="description" content="${title}">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a0a;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6}
.hero{background:linear-gradient(135deg,#0a0a0a 0%,#1a1a2e 100%);padding:80px 20px;text-align:center;border-bottom:1px solid #1a1a1a}
.hero h1{font-size:42px;background:linear-gradient(135deg,#00d4ff,#00ff88);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:16px}
.hero p{color:#a0a0a0;font-size:18px;max-width:600px;margin:0 auto 32px}
.cta-btn{display:inline-block;background:#00d4ff;color:#000;padding:14px 36px;border-radius:8px;font-weight:700;font-size:16px;text-decoration:none;transition:all .2s}
.cta-btn:hover{box-shadow:0 4px 24px #00d4ff44}
.section{padding:60px 20px;max-width:900px;margin:0 auto}
.section h2{font-size:28px;margin-bottom:24px;color:#00d4ff}
.section p{color:#a0a0a0;margin-bottom:16px;font-size:16px}
.features{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;padding:40px 20px;max-width:900px;margin:0 auto}
.feature-card{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:24px;text-align:center}
.feature-card h3{color:#fff;font-size:18px;margin-bottom:8px}
.feature-card p{color:#888;font-size:14px}
.footer{text-align:center;padding:40px;color:#555;font-size:13px;border-top:1px solid #1a1a1a}
</style>
</head>
<body>
<div class="hero">
  <h1>${title}</h1>
  <p>${siteName} — 25 000+ chaînes en 4K. Coupe du Monde 2026. Films, séries, sport en direct.</p>
  <a href="/#trial" class="cta-btn">🎬 Essai Gratuit</a>
</div>
<div class="features">
  <div class="feature-card"><h3>📺 25 000+ Chaînes</h3><p>Toutes les chaînes du monde en Full HD et 4K</p></div>
  <div class="feature-card"><h3>⚽ Sports en Direct</h3><p>Coupe du Monde 2026, LDC, Premier League, NBA</p></div>
  <div class="feature-card"><h3>📱 Multi-Écrans</h3><p>Jusqu'à 4 appareils simultanément</p></div>
  <div class="feature-card"><h3>🎬 10 000+ Films</h3><p>Bibliothèque VOD constamment mise à jour</p></div>
</div>
<div class="section">
  ${content}
  <div style="text-align:center;margin-top:32px">
    <a href="/#plans" class="cta-btn">💰 Voir les Offres</a>
  </div>
</div>
<div class="footer">
  <p>${siteName} — IPTV Premium</p>
  <p style="margin-top:8px"><a href="/#plans" style="color:#00d4ff;text-decoration:none">Abonnements</a> · <a href="/support" style="color:#00d4ff;text-decoration:none">Support</a></p>
</div>
</body>
</html>`
}

function logInjection(templateId, type, target, refId) {
  try {
    const db = getDb()
    db.prepare(`
      INSERT INTO titan_injection_log (template_id, injection_type, target, ref_id)
      VALUES (?, ?, ?, ?)
    `).run(templateId, type, String(target).substring(0, 200), refId || null)
  } catch {}
}

function slugify(text) {
  return text.toString().toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80)
}

async function getContentQueue(filters = {}) {
  const db = getDb()
  let query = 'SELECT q.*, t.name as template_name FROM titan_content_queue q LEFT JOIN titan_templates t ON q.template_id = t.id'
  const params = []
  const where = []
  if (filters.platform) { where.push('q.target_platform = ?'); params.push(filters.platform) }
  if (filters.status) { where.push('q.status = ?'); params.push(filters.status) }
  if (filters.posted !== undefined) { where.push('q.posted = ?'); params.push(filters.posted ? 1 : 0) }
  if (where.length) query += ' WHERE ' + where.join(' AND ')
  query += ' ORDER BY q.created_at DESC LIMIT 100'
  return db.prepare(query).all(...params)
}

async function markAsPosted(queueId) {
  const db = getDb()
  db.prepare("UPDATE titan_content_queue SET posted = 1, posted_at = datetime('now'), status = 'posted' WHERE id = ?").run(queueId)
  return { posted: true }
}

async function regenerateWithAI(templateId, prompt) {
  const db = getDb()
  const template = db.prepare('SELECT * FROM titan_templates WHERE id = ?').get(templateId)
  if (!template) throw new Error('Template not found')

  const fullPrompt = `Generate ${template.type} content for IPTV promotion.
Target: French-speaking audience (France, Belgium, Switzerland, Africa)
Service: ${prompt || 'Premium IPTV with 25,000+ channels including World Cup 2026'}
Style: Persuasive, urgent, benefit-focused
Include a clear call-to-action with trial offer.
Language: French.

Content:`

  const content = await titan.generate(fullPrompt)
  return { content, templateType: template.type }
}

module.exports = { injectNow, getContentQueue, markAsPosted, regenerateWithAI }
