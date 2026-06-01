const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { getDb } = require('../db');
const { signToken, authMiddleware, verifyGoogleToken, verifyAppleToken, findOrCreateUser, getUserSubscriptions } = require('../services/auth');

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email, and password required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const wid = req.website ? req.website.id : 1;
    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ? AND website_id = ?').get(email, wid);
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (name, email, password_hash, provider, website_id) VALUES (?, ?, ?, ?, ?)').run(name, email, hash, 'email', wid);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    const token = signToken(user);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !user.password_hash) return res.status(401).json({ error: 'Invalid email or password' });
    if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Invalid email or password' });
    const token = signToken(user);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'idToken required' });
    const info = await verifyGoogleToken(idToken);
    const user = await findOrCreateUser(info);
    const token = signToken(user);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar } });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/apple', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'idToken required' });
    const info = await verifyAppleToken(idToken);
    const user = await findOrCreateUser(info);
    const token = signToken(user);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar } });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, name, email, avatar, provider, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const subscriptions = getUserSubscriptions(user.id);
  res.json({ user, subscriptions });
});

module.exports = router;
