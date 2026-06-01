const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/:slug', (req, res) => {
  const db = getDb();
  const wid = req.website ? req.website.id : 1;
  const page = db.prepare('SELECT * FROM landing_pages WHERE slug = ? AND website_id = ? AND active = 1').get(req.params.slug, wid);
  if (!page) return res.status(404).send('Page not found');

  const today = new Date().toISOString().slice(0, 10);
  db.prepare('UPDATE landing_pages SET visits = visits + 1 WHERE id = ?').run(page.id);
  db.prepare(`INSERT INTO page_analytics (page_id, date, visits, conversions)
    VALUES (?, ?, 1, 0) ON CONFLICT(page_id, date) DO UPDATE SET visits = visits + 1`).run(page.id, today);

  res.send(page.html_content);
});

module.exports = router;
