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

router.get('/:id', (req, res) => {
  const db = getDb();
  const order = db.prepare(`SELECT o.*, pc.name as provider_name, pp.plan_name, pp.duration_days
    FROM orders o
    LEFT JOIN providers_catalog pc ON o.provider_id = pc.id
    LEFT JOIN provider_plans pp ON o.plan_id = pp.id
    WHERE o.id = ?`).get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  res.json(order);
});

module.exports = router;
