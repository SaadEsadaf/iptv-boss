const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.post('/', (req, res) => {
  const { session_id, customer_name, customer_email, customer_phone, customer_country, provider_id, plan_id, is_trial } = req.body;
  if (!customer_name || !customer_email || !provider_id || !plan_id) {
    return res.status(400).json({ error: 'customer_name, customer_email, provider_id, and plan_id required' });
  }

  const db = getDb();
  const wid = req.website ? req.website.id : 1;
  const result = db.prepare(
    'INSERT INTO orders (session_id, customer_name, customer_email, customer_phone, customer_country, provider_id, plan_id, is_trial, status, website_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(session_id || null, customer_name, customer_email, customer_phone || null, customer_country || null, provider_id, plan_id, is_trial ? 1 : 0, 'pending', wid);

  db.prepare(
    'INSERT INTO agent_log (agent, action, details, order_id, session_id) VALUES (?, ?, ?, ?, ?)'
  ).run('System', 'order_created', `Order created for ${customer_email}`, result.lastInsertRowid, session_id || null);

  res.json({ id: result.lastInsertRowid });
});

module.exports = router;
