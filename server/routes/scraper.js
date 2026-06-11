const express = require('express')
const router = express.Router()
const aiScraper = require('../services/aiScraper')

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const jwt = require('jsonwebtoken')
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'change_this_to_random_string')
    req.admin = decoded
    next()
  } catch { return res.status(401).json({ error: 'Invalid token' }) }
}

router.post('/run', authMiddleware, async (req, res) => {
  try {
    const count = await aiScraper.run()
    res.json({ leads_found: count })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/test-url', authMiddleware, async (req, res) => {
  try {
    const { url } = req.body
    if (!url) return res.status(400).json({ error: 'url required' })
    const pages = await aiScraper.scrapeUrl(url)
    const leads = await aiScraper.aiExtract(pages)
    res.json({ leads, url })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
