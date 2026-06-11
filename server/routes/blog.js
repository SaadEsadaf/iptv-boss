const express = require('express')
const router = express.Router()
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const jwt = require('jsonwebtoken')
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-key-2025')
    req.admin = decoded
    next()
  } catch { return res.status(401).json({ error: 'Invalid token' }) }
}
const { generateBlogPost, generateAllPosts, getPublishedPosts, getPost, getLanguages } = require('../services/blogGenerator')

router.get('/posts', (req, res) => {
  const posts = getPublishedPosts(req.query.lang)
  res.json(posts)
})

router.get('/posts/:slug', (req, res) => {
  const post = getPost(req.query.slug || req.params.slug)
  if (!post) return res.status(404).json({ error: 'Not found' })
  res.json(post)
})

router.get('/languages', (req, res) => {
  res.json(getLanguages())
})

router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { topic } = req.body
    if (topic) {
      const r = await generateBlogPost(topic)
      return res.json(r)
    }
    const results = await generateAllPosts()
    res.json({ generated: results.filter(r => !r.error && !r.existing).length, total: results.length })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
