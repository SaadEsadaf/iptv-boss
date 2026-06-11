const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { getDb } = require('../db');
const { signToken, authMiddleware } = require('../services/auth');

// Register with email + password
router.post('/api/account/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const db = getDb();
    const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const wid = req.website ? req.website.id : 1;
    const result = db.prepare(
      'INSERT INTO users (name, email, password_hash, website_id, provider) VALUES (?, ?, ?, ?, ?)'
    ).run(name || email.split('@')[0], email, passwordHash, wid, 'email');

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    const token = signToken(user);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Login with email + password
router.post('/api/account/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !user.password_hash) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Magic link request (send login email)
router.post('/api/account/magic-link', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const db = getDb();
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      const wid = req.website ? req.website.id : 1;
      const result = db.prepare(
        'INSERT INTO users (name, email, provider, website_id) VALUES (?, ?, ?, ?)'
      ).run(email.split('@')[0], email, 'email', wid);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    db.prepare('UPDATE users SET magic_link_token = ?, magic_link_expires = ? WHERE id = ?').run(token, expiresAt, user.id);

    const { sendTrial } = require('../services/emailService');
    const siteUrl = (db.prepare("SELECT value FROM app_settings WHERE key = 'site_url'").get() || {}).value || 'https://dalletek.live';
    const loginUrl = `${siteUrl}/dashboard?magic=${token}&email=${encodeURIComponent(email)}`;

    await sendTrial({
      email,
      name: user.name,
      credentials: { username: email, password: 'Click the link below', server_url: loginUrl },
      durationHours: 1,
      providerName: 'Dalletek',
      planName: 'Magic Link',
    }).catch(e => console.error('Magic link email error:', e));

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Magic link verify
router.post('/api/account/magic-verify', (req, res) => {
  try {
    const { token, email } = req.body;
    if (!token || !email) return res.status(400).json({ error: 'Token and email required' });

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND magic_link_token = ?').get(email, token);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' });

    const now = new Date().toISOString();
    if (user.magic_link_expires && user.magic_link_expires < now) {
      return res.status(401).json({ error: 'Token expired' });
    }

    db.prepare('UPDATE users SET magic_link_token = NULL, magic_link_expires = NULL WHERE id = ?').run(user.id);
    const jwt = signToken(user);
    res.json({ token: jwt, user: { id: user.id, name: user.name, email: user.email } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get user profile + orders
router.get('/api/account/profile', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const orders = db.prepare(`
      SELECT o.*, pp.plan_name, pp.duration_days, pp.duration_months,
             pc.name as provider_name, pc.panel_url as server_url
      FROM orders o
      LEFT JOIN provider_plans pp ON o.plan_id = pp.id
      LEFT JOIN providers_catalog pc ON o.provider_id = pc.id
      WHERE o.user_id = ? OR o.customer_email = ?
      ORDER BY o.created_at DESC
    `).all(req.user.id, user.email);

    // Attach credentials
    const enrichedOrders = orders.map(o => {
      let credentials = null;
      if (o.is_trial && o.trial_code_id) {
        const trial = db.prepare('SELECT * FROM trial_codes WHERE id = ?').get(o.trial_code_id);
        if (trial) {
          const m3uUrl = trial.server_url
            ? `${trial.server_url}/get.php?username=${trial.username}&password=${trial.password}&type=m3u_plus&output=ts`
            : null;
          credentials = { type: 'xtream', server_url: trial.server_url, username: trial.username, password: trial.password, m3u_url: m3uUrl, code: trial.code };
        }
      } else if (o.activation_code_id) {
        const code = db.prepare('SELECT * FROM activation_codes WHERE id = ?').get(o.activation_code_id);
        if (code) {
          const m3uUrl = code.server_url
            ? `${code.server_url}/get.php?username=${code.username}&password=${code.password}&type=m3u_plus&output=ts`
            : null;
          credentials = { type: 'xtream', server_url: code.server_url, username: code.username, password: code.password, m3u_url: m3uUrl, code: code.code };
        }
      }
      const expiresAt = o.is_trial && o.created_at
        ? new Date(new Date(o.created_at).getTime() + (o.duration_days || 1) * 24 * 60 * 60 * 1000).toISOString()
        : o.created_at
        ? new Date(new Date(o.created_at).getTime() + (o.duration_days || 30) * 24 * 60 * 60 * 1000).toISOString()
        : null;
      return { ...o, credentials, expires_at: expiresAt };
    });

    // Get available plans for upgrade
    const plans = db.prepare(`
      SELECT pp.*, pc.name as provider_name
      FROM provider_plans pp
      JOIN providers_catalog pc ON pp.provider_id = pc.id
      WHERE pp.active = 1 AND pc.active = 1
        AND pp.plan_type != 'trial'
      ORDER BY pp.price_sell ASC
    `).all();

    res.json({ user, orders: enrichedOrders, plans });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update preferred app
router.post('/api/account/preferred-app', authMiddleware, (req, res) => {
  try {
    const { app } = req.body;
    const validApps = ['tivimate', 'smarters', 'gse', 'vlc', 'm3u', 'activation_code'];
    if (!validApps.includes(app)) return res.status(400).json({ error: 'Invalid app' });

    const db = getDb();
    db.prepare('UPDATE users SET preferred_app = ? WHERE id = ?').run(app, req.user.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
