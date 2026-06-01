const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const { getDb } = require('../db')

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

router.get('/signals', authMiddleware, (req, res) => {
  const db = getDb()
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 50
  const offset = (page - 1) * limit
  const source = req.query.source || ''
  const status = req.query.status || ''
  const language = req.query.language || ''
  const hasEmail = req.query.hasEmail || ''
  const hasPhone = req.query.hasPhone || ''

  let where = []
  let params = []
  if (source) { where.push('source = ?'); params.push(source) }
  if (status) { where.push('status = ?'); params.push(status) }
  if (language) { where.push('language = ?'); params.push(language) }
  if (hasEmail === '1') { where.push("email != ''") }
  if (hasPhone === '1') { where.push("phone != ''") }
  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : ''

  const total = db.prepare(`SELECT COUNT(*) as c FROM demand_signals ${whereClause}`).get(...params).c
  const rows = db.prepare(`SELECT * FROM demand_signals ${whereClause} ORDER BY intent_score DESC, created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset)

  res.json({ total, page, limit, signals: rows })
})

router.get('/signals/stats', authMiddleware, (req, res) => {
  const db = getDb()
  const bySource = db.prepare("SELECT source, COUNT(*) as count FROM demand_signals GROUP BY source").all()
  const byStatus = db.prepare("SELECT status, COUNT(*) as count FROM demand_signals GROUP BY status").all()
  const byLanguage = db.prepare("SELECT language, COUNT(*) as count FROM demand_signals WHERE language != '' GROUP BY language").all()
  const byIntentRange = [
    { range: '0-25', count: db.prepare("SELECT COUNT(*) as c FROM demand_signals WHERE intent_score BETWEEN 0 AND 25").get().c },
    { range: '26-50', count: db.prepare("SELECT COUNT(*) as c FROM demand_signals WHERE intent_score BETWEEN 26 AND 50").get().c },
    { range: '51-75', count: db.prepare("SELECT COUNT(*) as c FROM demand_signals WHERE intent_score BETWEEN 51 AND 75").get().c },
    { range: '76-100', count: db.prepare("SELECT COUNT(*) as c FROM demand_signals WHERE intent_score BETWEEN 76 AND 100").get().c },
  ]
  const lastRun = db.prepare("SELECT created_at FROM agent_log WHERE agent = 'TelegramSniffer' ORDER BY created_at DESC LIMIT 1").get()
  const total = db.prepare('SELECT COUNT(*) as c FROM demand_signals').get().c
  const avgScore = db.prepare('SELECT AVG(intent_score) as avg FROM demand_signals').get().avg
  const withEmail = db.prepare("SELECT COUNT(*) as c FROM demand_signals WHERE email != ''").get().c
  const withPhone = db.prepare("SELECT COUNT(*) as c FROM demand_signals WHERE phone != ''").get().c
  const withGroups = db.prepare("SELECT COUNT(*) as c FROM demand_signals WHERE groups_mentioned != ''").get().c

  res.json({
    total, avgScore: Math.round(avgScore || 0),
    bySource, byStatus, byLanguage, byIntentRange,
    contactInfo: { withEmail, withPhone, withGroups },
    lastSniff: lastRun?.created_at || null,
  })
})

router.post('/signals/sniff', authMiddleware, async (req, res) => {
  try {
    const { sniffTelegramAndSave } = require('../services/telegramSniffer')
    const result = await sniffTelegramAndSave()
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/signals/sniff-all', authMiddleware, async (req, res) => {
  try {
    const { sniffTelegramAndSave } = require('../services/telegramSniffer')
    const { sniffRedditAndSave } = require('../services/redditSniffer')
    const { sniffYouTubeAndSave } = require('../services/youtubeSniffer')
    const { sniffTwitterAndSave } = require('../services/twitterSniffer')
    const results = await Promise.allSettled([
      sniffTelegramAndSave(),
      sniffRedditAndSave(),
      sniffYouTubeAndSave(),
      sniffTwitterAndSave(),
    ])
    res.json({
      telegram: results[0].status === 'fulfilled' ? results[0].value : { error: results[0].reason?.message },
      reddit: results[1].status === 'fulfilled' ? results[1].value : { error: results[1].reason?.message },
      youtube: results[2].status === 'fulfilled' ? results[2].value : { error: results[2].reason?.message },
      twitter: results[3].status === 'fulfilled' ? results[3].value : { error: results[3].reason?.message },
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.put('/signals/:id/enrich', authMiddleware, async (req, res) => {
  try {
    const { enrichSignal } = require('../services/telegramSniffer')
    const result = await enrichSignal(req.params.id)
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.put('/signals/:id/status', authMiddleware, (req, res) => {
  const db = getDb()
  const { status } = req.body
  const valid = ['new', 'ad_created', 'page_built', 'contacted', 'dismissed']
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' })
  db.prepare('UPDATE demand_signals SET status = ? WHERE id = ?').run(status, req.params.id)
  res.json({ success: true })
})

router.get('/signals/leads-stats', authMiddleware, (req, res) => {
  const db = getDb()
  const topLeads = db.prepare(`
    SELECT content, pain_point, opportunity, intent_score, language, source
    FROM demand_signals WHERE status != 'dismissed' ORDER BY intent_score DESC LIMIT 20
  `).all()
  const painPoints = topLeads.filter(l => l.pain_point).map(l => l.pain_point).slice(0, 10)
  const opportunities = topLeads.filter(l => l.opportunity).map(l => l.opportunity).slice(0, 10)
  const languages = [...new Set(topLeads.filter(l => l.language).map(l => l.language))]
  const avgIntent = db.prepare("SELECT AVG(intent_score) as avg FROM demand_signals WHERE status != 'dismissed'").get().avg

  res.json({ topLeads, painPoints, opportunities, languages, avgIntent: Math.round(avgIntent || 0) })
})

const ALLOWED_SETTINGS = [
  'telegram_channels', 'telegram_sniffer_interval', 'telegram_sniffer_enabled',
  'youtube_channels', 'youtube_api_key', 'youtube_sniffer_interval', 'youtube_sniffer_enabled',
  'reddit_channels', 'reddit_sniffer_interval', 'reddit_sniffer_enabled',
  'twitter_channels', 'twitter_sniffer_interval', 'twitter_sniffer_enabled',
  'serpapi_key', 'rank_check_interval',
  'auto_build_enabled', 'auto_build_threshold', 'auto_build_max_per_run', 'auto_build_interval',
]

router.get('/settings', authMiddleware, (req, res) => {
  const db = getDb()
  const get = key => (db.prepare("SELECT value FROM app_settings WHERE key = ?").get(key) || {}).value || ''
  const result = {}
  for (const key of ALLOWED_SETTINGS) result[key] = get(key)
  res.json(result)
})

router.put('/settings', authMiddleware, (req, res) => {
  const db = getDb()
  const upsert = db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)')
  for (const key of ALLOWED_SETTINGS) {
    if (req.body[key] !== undefined) upsert.run(key, String(req.body[key]))
  }
  res.json({ success: true })
})

router.get('/signals/sources', authMiddleware, (req, res) => {
  const { getAllSourcePerformance, addSource, toggleSource, discoverNewSources } = require('../services/sourceRanker')
  const performance = getAllSourcePerformance()
  res.json(performance)
})

router.post('/signals/sources/discover', authMiddleware, async (req, res) => {
  const { discoverNewSources } = require('../services/sourceRanker')
  const { type } = req.body
  if (!type) return res.status(400).json({ error: 'type required' })
  const added = await discoverNewSources(type)
  res.json({ added })
})

router.post('/signals/sources/add', authMiddleware, (req, res) => {
  const { addSource } = require('../services/sourceRanker')
  const { type, name } = req.body
  if (!type || !name) return res.status(400).json({ error: 'type and name required' })
  addSource(type, name)
  res.json({ success: true })
})

router.post('/signals/sources/toggle', authMiddleware, (req, res) => {
  const { toggleSource } = require('../services/sourceRanker')
  const { type, name, enabled } = req.body
  if (!type || !name) return res.status(400).json({ error: 'type, name, enabled required' })
  toggleSource(type, name, enabled)
  res.json({ success: true })
})

module.exports = router
