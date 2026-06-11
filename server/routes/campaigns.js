const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const { getDb } = require('../db')
const { renderEmailTemplate, getTransporter } = require('../services/emailService')

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_to_random_string'

function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
  try {
    req.admin = jwt.verify(header.split(' ')[1], JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

function ensureCampaignsTable() {
  const db = getDb()
  db.exec(`CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    template_key TEXT,
    subject TEXT,
    body TEXT,
    filters TEXT,
    total_leads INTEGER DEFAULT 0,
    emails_sent INTEGER DEFAULT 0,
    emails_failed INTEGER DEFAULT 0,
    status TEXT DEFAULT 'draft',
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    sent_at TEXT
  )`)
  db.exec(`CREATE TABLE IF NOT EXISTS campaign_leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    lead_email TEXT,
    lead_name TEXT,
    lead_source TEXT,
    status TEXT DEFAULT 'pending',
    sent_at TEXT,
    error TEXT,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
  )`)
}

ensureCampaignsTable()

router.get('/leads/stats', authMiddleware, (req, res) => {
  const db = getDb()
  const totalLeads = db.prepare("SELECT COUNT(*) as c FROM demand_signals WHERE status != 'dismissed'").get().c
  const withEmail = db.prepare("SELECT COUNT(*) as c FROM demand_signals WHERE email != '' AND email IS NOT NULL AND status != 'dismissed'").get().c
  const withPhone = db.prepare("SELECT COUNT(*) as c FROM demand_signals WHERE phone != '' AND phone IS NOT NULL AND status != 'dismissed'").get().c
  const withBoth = db.prepare("SELECT COUNT(*) as c FROM demand_signals WHERE email != '' AND email IS NOT NULL AND phone != '' AND phone IS NOT NULL AND status != 'dismissed'").get().c
  const orders = db.prepare("SELECT COUNT(*) as c FROM orders").get().c
  const ordersCompleted = db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'completed'").get().c

  const byLanguage = db.prepare(`
    SELECT COALESCE(NULLIF(language, ''), 'unknown') as lang, COUNT(*) as count
    FROM demand_signals WHERE status != 'dismissed'
    GROUP BY lang ORDER BY count DESC
  `).all()

  const bySource = db.prepare(`
    SELECT source, COUNT(*) as count
    FROM demand_signals WHERE status != 'dismissed'
    GROUP BY source ORDER BY count DESC
  `).all()

  const byIntent = db.prepare(`
    SELECT
      CASE WHEN intent_score >= 80 THEN 'hot'
           WHEN intent_score >= 60 THEN 'warm'
           WHEN intent_score >= 30 THEN 'lukewarm'
           ELSE 'cold'
      END as tier,
      COUNT(*) as count
    FROM demand_signals WHERE status != 'dismissed'
    GROUP BY tier ORDER BY count DESC
  `).all()

  const byStatus = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM demand_signals GROUP BY status ORDER BY count DESC
  `).all()

  res.json({
    totalLeads,
    withEmail,
    withPhone,
    withBoth,
    orders,
    ordersCompleted,
    byLanguage,
    bySource,
    byIntent,
    byStatus,
  })
})

router.get('/leads', authMiddleware, (req, res) => {
  const db = getDb()
  const page = parseInt(req.query.page) || 1
  const limit = Math.min(parseInt(req.query.limit) || 50, 200)
  const offset = (page - 1) * limit
  const { source, language, intent_min, intent_max, hasEmail, hasPhone, status, search, sort, order } = req.query

  let where = ["ds.status != 'dismissed'"]
  let params = []

  if (source) { where.push('ds.source = ?'); params.push(source) }
  if (language) { where.push("COALESCE(NULLIF(ds.language, ''), 'unknown') = ?"); params.push(language) }
  if (intent_min) { where.push('ds.intent_score >= ?'); params.push(Number(intent_min)) }
  if (intent_max) { where.push('ds.intent_score <= ?'); params.push(Number(intent_max)) }
  if (hasEmail === 'true') { where.push("ds.email != '' AND ds.email IS NOT NULL") }
  if (hasEmail === 'false') { where.push("(ds.email = '' OR ds.email IS NULL)") }
  if (hasPhone === 'true') { where.push("ds.phone != '' AND ds.phone IS NOT NULL") }
  if (hasPhone === 'false') { where.push("(ds.phone = '' OR ds.phone IS NULL)") }
  if (status) { where.push('ds.status = ?'); params.push(status) }
  if (search) {
    where.push("(ds.content LIKE ? OR ds.email LIKE ? OR ds.phone LIKE ? OR ds.author LIKE ? OR ds.lead_contact LIKE ?)")
    const s = `%${search}%`
    params.push(s, s, s, s, s)
  }

  const whereClause = 'WHERE ' + where.join(' AND ')

  const total = db.prepare(`SELECT COUNT(*) as c FROM demand_signals ds ${whereClause}`).get(...params).c

  const sortCol = sort || 'ds.intent_score'
  const sortDir = order === 'asc' ? 'ASC' : 'DESC'
  const allowedSorts = ['ds.intent_score', 'ds.created_at', 'ds.language', 'ds.source', 'ds.email', 'ds.status']
  const safeSort = allowedSorts.includes(sortCol) ? sortCol : 'ds.intent_score'

  const leads = db.prepare(`
    SELECT ds.*,
      CASE WHEN o.id IS NOT NULL THEN 1 ELSE 0 END as has_order
    FROM demand_signals ds
    LEFT JOIN orders o ON o.customer_email = ds.email AND o.status = 'completed'
    ${whereClause}
    ORDER BY ${safeSort} ${sortDir}
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset)

  res.json({ total, page, limit, leads })
})

router.get('/templates', authMiddleware, (req, res) => {
  const db = getDb()
  const templates = db.prepare('SELECT id, template_key, name, subject, variables FROM email_templates ORDER BY name').all()
  res.json(templates)
})

router.post('/blast', authMiddleware, async (req, res) => {
  try {
    const db = getDb()
    const { name, template_key, filters } = req.body
    if (!name || !template_key) return res.status(400).json({ error: 'name and template_key required' })

    const template = db.prepare('SELECT * FROM email_templates WHERE template_key = ?').get(template_key)
    if (!template) return res.status(404).json({ error: 'Template not found' })

    let where = ["ds.status != 'dismissed'", "ds.email != ''", 'ds.email IS NOT NULL']
    let params = []

    if (filters?.source) { where.push('ds.source = ?'); params.push(filters.source) }
    if (filters?.language) { where.push("COALESCE(NULLIF(ds.language, ''), 'unknown') = ?"); params.push(filters.language) }
    if (filters?.intent_min) { where.push('ds.intent_score >= ?'); params.push(Number(filters.intent_min)) }
    if (filters?.intent_max) { where.push('ds.intent_score <= ?'); params.push(Number(filters.intent_max)) }
    if (filters?.hasPhone === 'true') { where.push("ds.phone != '' AND ds.phone IS NOT NULL") }
    if (filters?.status) { where.push('ds.status = ?'); params.push(filters.status) }

    const leads = db.prepare(`
      SELECT ds.id, ds.email, ds.author as name, ds.source, ds.language
      FROM demand_signals ds
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY ds.intent_score DESC
    `).all(...params)

    if (leads.length === 0) return res.status(400).json({ error: 'No leads match the filters' })

    const filtersJson = JSON.stringify(filters || {})
    const campaign = db.prepare(`
      INSERT INTO campaigns (name, template_key, subject, body, filters, total_leads, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, 'sending', ?)
    `).run(name, template_key, template.subject, template.body_html, filtersJson, leads.length, req.admin.username)
    const campaignId = campaign.lastInsertRowid

    const insertLead = db.prepare(`
      INSERT INTO campaign_leads (campaign_id, lead_email, lead_name, lead_source, status)
      VALUES (?, ?, ?, ?, 'pending')
    `)
    const insertBatch = db.transaction((batch) => {
      for (const lead of batch) {
        insertLead.run(campaignId, lead.email, lead.name || lead.email.split('@')[0], lead.source)
      }
    })
    insertBatch(leads)

    const transporter = getTransporter()
    const fromName = transporter.fromName
    const fromEmail = transporter.fromEmail
    const siteName = (db.prepare("SELECT value FROM app_settings WHERE key = 'site_name'").get() || {}).value || 'Dalletek'
    const siteUrl = (db.prepare("SELECT value FROM app_settings WHERE key = 'site_url'").get() || {}).value || 'http://localhost:3001'

    let sent = 0
    let failed = 0

    for (const lead of leads) {
      try {
        const rendered = renderEmailTemplate(template_key, {
          customer_name: lead.name || lead.email.split('@')[0],
          customer_email: lead.email,
          site_name: siteName,
          site_url: siteUrl,
        })
        if (!rendered) {
          failed++
          db.prepare("UPDATE campaign_leads SET status = 'failed', error = 'Template render failed' WHERE campaign_id = ? AND lead_email = ?").run(campaignId, lead.email)
          continue
        }
        await transporter.sendMail({
          from: `"${fromName}" <${fromEmail}>`,
          to: lead.email,
          subject: rendered.subject,
          html: rendered.body,
        })
        sent++
        db.prepare("UPDATE campaign_leads SET status = 'sent', sent_at = datetime('now') WHERE campaign_id = ? AND lead_email = ?").run(campaignId, lead.email)
        db.prepare("INSERT INTO sales_engine_log (action, lead_email, lead_name, sequence_type, details, lead_id, source) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
          'campaign_blast', lead.email, lead.name || '', name, `Campaign: ${name}`, lead.id, lead.source
        )
      } catch (e) {
        failed++
        db.prepare("UPDATE campaign_leads SET status = 'failed', error = ? WHERE campaign_id = ? AND lead_email = ?").run(e.message?.substring(0, 200) || 'Unknown error', campaignId, lead.email)
      }
    }

    db.prepare("UPDATE campaigns SET emails_sent = ?, emails_failed = ?, status = 'sent', sent_at = datetime('now') WHERE id = ?").run(sent, failed, campaignId)

    res.json({
      success: true, campaignId,
      total: leads.length, sent, failed,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/history', authMiddleware, (req, res) => {
  const db = getDb()
  const page = parseInt(req.query.page) || 1
  const limit = Math.min(parseInt(req.query.limit) || 20, 100)
  const offset = (page - 1) * limit

  const total = db.prepare('SELECT COUNT(*) as c FROM campaigns').get().c
  const campaigns = db.prepare('SELECT * FROM campaigns ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset)

  const result = campaigns.map(c => ({
    ...c,
    filters: c.filters ? JSON.parse(c.filters) : null,
  }))

  res.json({ total, page, limit, campaigns: result })
})

router.get('/history/:id', authMiddleware, (req, res) => {
  const db = getDb()
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id)
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' })

  const leads = db.prepare('SELECT * FROM campaign_leads WHERE campaign_id = ? ORDER BY status, sent_at DESC').all(req.params.id)

  res.json({
    ...campaign,
    filters: campaign.filters ? JSON.parse(campaign.filters) : null,
    leads,
  })
})

// Blast single email (used by JobTools world cup campaign)
router.post('/blast-single', async (req, res) => {
  try {
    const db = getDb()
    const { email, name, template_key, campaign_name, variables } = req.body
    if (!email || !template_key) return res.status(400).json({ error: 'email and template_key required' })

    const template = db.prepare('SELECT * FROM email_templates WHERE template_key = ?').get(template_key)
    if (!template) return res.status(404).json({ error: 'Template not found' })

    const transporter = getTransporter()
    const fromName = transporter.fromName
    const fromEmail = transporter.fromEmail
    const siteName = (db.prepare("SELECT value FROM app_settings WHERE key = 'site_name'").get() || {}).value || 'Dalletek'
    const siteUrl = (db.prepare("SELECT value FROM app_settings WHERE key = 'site_url'").get() || {}).value || 'http://localhost:3001'

    const vars = {
      customer_name: name || email.split('@')[0],
      customer_email: email,
      site_name: siteName,
      site_url: siteUrl,
      trial_url: `${siteUrl}/trial`,
      trial_code: '',
      tracking_pixel: '',
      unsubscribe_url: '',
      ...(variables || {}),
    }

    let body = template.body_html
    let subject = template.subject

    for (const [k, v] of Object.entries(vars)) {
      if (v !== null && v !== undefined) {
        body = body.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v))
        subject = subject.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v))
      }
    }

    // Handle {{#if var}}...{{/if}} blocks
    body = body.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, name, content) => {
      return vars[name] ? content : ''
    })

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject,
      html: body,
    })

    db.prepare(`INSERT INTO sales_engine_log (action, lead_email, lead_name, sequence_type, details, source)
      VALUES ('sent', ?, ?, 'worldcup_2026', ?, 'worldcup_2026')`).run(
      email, name || '', `World Cup campaign email sent`
    )

    // Track assignment - skip trial_code_id to avoid foreign key constraint
    db.prepare(`INSERT OR IGNORE INTO trial_assignments (trial_code_id, lead_email, lead_name, campaign, code, status, email_sent)
      VALUES (NULL, ?, ?, ?, '', 'assigned', 1)`).run(email, name || '', campaign_name || 'worldcup_2026')

    res.json({ sent: true, email })
  } catch (e) {
    console.error('[BlastSingle] Error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
