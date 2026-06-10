const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const { getDb } = require('../db')
const {
  enrollLeadInSequence,
  enrollTrialUser,
  processEmailQueue,
  getSalesEngineStats,
  scoreLead,
  SEQUENCE_TYPES,
} = require('../services/salesEngine')

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

router.get('/stats', authMiddleware, (req, res) => {
  const stats = getSalesEngineStats()
  res.json(stats)
})

router.post('/enroll-lead', authMiddleware, async (req, res) => {
  try {
    const { leadId, email, sequenceType } = req.body
    const db = getDb()

    if (leadId) {
      const lead = db.prepare('SELECT * FROM demand_signals WHERE id = ?').get(leadId)
      if (!lead) return res.status(404).json({ error: 'Lead not found' })
      const count = await enrollLeadInSequence(lead, sequenceType)
      return res.json({ success: true, emailsQueued: count })
    }

    if (email) {
      const lead = { email, id: null, source: 'manual', language: 'en', intent_score: 50 }
      const count = await enrollLeadInSequence(lead, sequenceType)
      return res.json({ success: true, emailsQueued: count })
    }

    res.status(400).json({ error: 'leadId or email required' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/enroll-trial', authMiddleware, async (req, res) => {
  try {
    const { orderId, customerEmail, customerName } = req.body
    if (!orderId || !customerEmail) return res.status(400).json({ error: 'orderId and customerEmail required' })
    const count = await enrollTrialUser(orderId, customerEmail, customerName, null)
    res.json({ success: true, emailsQueued: count })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/process-queue', authMiddleware, async (req, res) => {
  try {
    const processed = await processEmailQueue()
    res.json({ success: true, processed })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/queue', authMiddleware, (req, res) => {
  const db = getDb()
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 50
  const offset = (page - 1) * limit
  const status = req.query.status || ''
  const sequence = req.query.sequence || ''

  let where = []
  let params = []
  if (status) { where.push('status = ?'); params.push(status) }
  if (sequence) { where.push('sequence_type = ?'); params.push(sequence) }
  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : ''

  const total = db.prepare(`SELECT COUNT(*) as c FROM email_queue ${whereClause}`).get(...params).c
  const rows = db.prepare(`SELECT * FROM email_queue ${whereClause} ORDER BY scheduled_at ASC LIMIT ? OFFSET ?`).all(...params, limit, offset)

  res.json({ total, page, limit, queue: rows })
})

router.get('/activity', authMiddleware, (req, res) => {
  const db = getDb()
  const logs = db.prepare('SELECT * FROM sales_engine_log ORDER BY created_at DESC LIMIT 100').all()
  res.json({ logs })
})

router.get('/sequences', authMiddleware, (req, res) => {
  const sequences = Object.entries(SEQUENCE_TYPES).map(([name, key]) => ({
    name,
    key,
    stepCount: Object.keys(require('../services/salesEngine').EMAIL_TEMPLATES[key] || {}).length,
  }))
  res.json(sequences)
})

router.get('/leads/scored', authMiddleware, (req, res) => {
  const db = getDb()
  const leads = db.prepare(`
    SELECT ds.*,
      CASE
        WHEN ds.intent_score >= 80 AND ds.email != '' THEN 'hot'
        WHEN ds.intent_score >= 60 AND ds.email != '' THEN 'warm'
        ELSE 'cold'
      END as lead_category
    FROM demand_signals ds
    WHERE ds.status != 'dismissed' AND ds.email != ''
    ORDER BY ds.intent_score DESC
    LIMIT 100
  `).all()
  const scored = leads.map(l => ({ ...l, score: scoreLead(l) }))
  res.json(scored)
})

router.post('/whatsapp/send', authMiddleware, async (req, res) => {
  const { sendWhatsApp } = require('../services/salesEngine')
  const { phone, message } = req.body
  if (!phone || !message) return res.status(400).json({ error: 'phone and message required' })
  const result = await sendWhatsApp(phone, message)
  res.json(result)
})

module.exports = router