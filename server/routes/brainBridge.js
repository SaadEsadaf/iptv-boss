const express = require('express')
const { getDb } = require('../db')

const router = express.Router()

const JOBTOOLS_API_KEY = process.env.JOBTOOLS_API_KEY || 'jobtools-bridge-key-2024'

function ensureLogTable() {
  const db = getDb()
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      action TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
}

router.post('/event', async (req, res) => {
  const { source, api_key, event, payload } = req.body

  if (source !== 'jobtools' || api_key !== JOBTOOLS_API_KEY) {
    return res.status(403).json({ error: 'Unauthorized' })
  }

  const db = getDb()
  ensureLogTable()

  try {
    switch (event) {
      case 'campaign_executed': {
        const summary = `Campagne "${payload?.campaign_name}" exécutée par JobTools`
        db.prepare(`INSERT INTO activity_log (type, action, details, created_at) VALUES ('campaign', ?, ?, ?)`)
          .run(summary, JSON.stringify(payload), new Date().toISOString())
        break
      }
      case 'leads_sync': {
        db.prepare(`INSERT INTO activity_log (type, action, details, created_at) VALUES ('leads', 'Import de leads depuis JobTools', ?, ?)`)
          .run(JSON.stringify(payload), new Date().toISOString())
        break
      }
      case 'campaigns_sync': {
        db.prepare(`INSERT INTO activity_log (type, action, details, created_at) VALUES ('campaigns', 'Sync campagnes depuis JobTools', ?, ?)`)
          .run(JSON.stringify(payload), new Date().toISOString())
        break
      }
      default: {
        db.prepare(`INSERT INTO activity_log (type, action, details, created_at) VALUES ('jobtools', ?, ?, ?)`)
          .run(`Événement JobTools: ${event}`, JSON.stringify(payload), new Date().toISOString())
      }
    }
    res.json({ received: true, event })
  } catch (err) {
    console.error('Brain bridge error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.get('/leads/export', (req, res) => {
  const db = getDb()
  const raw = db.prepare(`
    SELECT source, source_name, content, author, phone, email, language, intent_score, status, lead_contact, created_at
    FROM demand_signals
    ORDER BY intent_score DESC
    LIMIT 1000
  `).all()
  const mapped = raw.map(r => ({
    source: r.source,
    language: r.language,
    username: r.author || r.source_name,
    first_name: r.author ? r.author.split(' ')[0] : null,
    last_name: r.author ? r.author.split(' ').slice(1).join(' ') : null,
    phone: r.phone,
    email: r.email,
    intent_score: r.intent_score || 0,
    intent_label: null,
    status: r.status || 'new',
    raw_data: JSON.stringify(r)
  }))
  res.json(mapped)
})

module.exports = router
