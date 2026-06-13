const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/pixel.gif', (req, res) => {
  const { campaign, email } = req.query;
  if (campaign && email) {
    try {
      const db = getDb();
      db.prepare(`INSERT INTO email_tracking (campaign, lead_email, event_type, ip_address, user_agent, referrer, metadata)
        VALUES (?, ?, 'open', ?, ?, ?, ?)`).run(
        campaign, email,
        req.ip || req.connection.remoteAddress || '',
        req.headers['user-agent'] || '',
        req.headers['referer'] || '',
        JSON.stringify({ query: req.query })
      );
    } catch (e) {/* silent */}
  }
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.end(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
});

router.get('/click', (req, res) => {
  const { campaign, email, url, code } = req.query;
  const targetUrl = url || (code ? '/trial?code=' + encodeURIComponent(code) + '&email=' + encodeURIComponent(email || '') : '/');

  if (campaign && email) {
    try {
      const db = getDb();
      db.prepare(`INSERT INTO email_tracking (campaign, lead_email, event_type, ip_address, user_agent, referrer, metadata)
        VALUES (?, ?, 'click', ?, ?, ?, ?)`).run(
        campaign, email,
        req.ip || req.connection.remoteAddress || '',
        req.headers['user-agent'] || '',
        req.headers['referer'] || '',
        JSON.stringify({ url: targetUrl, code, query: req.query })
      );

      db.prepare(`UPDATE trial_assignments SET link_clicked = 1 WHERE lead_email = ? AND campaign = ?`).run(email, campaign);
    } catch (e) {/* silent */}
  }

  res.redirect(302, targetUrl);
});

router.get('/stats/:campaign', (req, res) => {
  const db = getDb();
  const campaign = req.params.campaign;
  const opens = db.prepare("SELECT COUNT(DISTINCT lead_email) as c FROM email_tracking WHERE campaign = ? AND event_type = 'open'").get(campaign);
  const clicks = db.prepare("SELECT COUNT(DISTINCT lead_email) as c FROM email_tracking WHERE campaign = ? AND event_type = 'click'").get(campaign);
  const total = db.prepare("SELECT COUNT(*) as c FROM trial_assignments WHERE campaign = ?").get(campaign);
  const activated = db.prepare("SELECT COUNT(*) as c FROM trial_assignments WHERE campaign = ? AND trial_activated = 1").get(campaign);
  const converted = db.prepare("SELECT COUNT(*) as c FROM trial_assignments WHERE campaign = ? AND converted = 1").get(campaign);

  const recent = db.prepare(`SELECT * FROM email_tracking WHERE campaign = ? ORDER BY created_at DESC LIMIT 50`).all(campaign);

  res.json({
    campaign,
    unique_opens: opens.c,
    unique_clicks: clicks.c,
    total_sent: total.c,
    activated,
    converted,
    open_rate: total.c > 0 ? ((opens.c / total.c) * 100).toFixed(1) : 0,
    click_rate: total.c > 0 ? ((clicks.c / total.c) * 100).toFixed(1) : 0,
    conversion_rate: total.c > 0 ? ((converted.c / total.c) * 100).toFixed(1) : 0,
    recent_events: recent,
  });
});

router.post('/activate-trial', async (req, res) => {
  try {
    const db = getDb();
    const { name, email, code, source, preferred_app } = req.body;

    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'Email and code required' });
    }

    const trialCode = db.prepare("SELECT * FROM trial_codes WHERE code = ? AND status = 'available'").get(code);
    if (!trialCode) {
      return res.json({ success: false, error: 'This code is no longer available. All 9 trials have been claimed.' });
    }

    // Save preferred app
    if (preferred_app) {
      db.prepare("UPDATE trial_codes SET preferred_app = ? WHERE id = ?").run(preferred_app, trialCode.id);
    }

    const expiresAt = new Date(Date.now() + (trialCode.duration_hours || 24) * 60 * 60 * 1000).toISOString();
    db.prepare("UPDATE trial_codes SET status = 'used', assigned_at = datetime('now'), expires_at = ? WHERE id = ?")
      .run(expiresAt, trialCode.id);

    let assignmentId = null;
    const existing = db.prepare("SELECT id FROM trial_assignments WHERE code = ? AND lead_email = ?").get(code, email);
    if (existing) {
      db.prepare("UPDATE trial_assignments SET status = 'activated', trial_activated = 1, activated_at = datetime('now') WHERE id = ?").run(existing.id);
      assignmentId = existing.id;
    } else {
      const result = db.prepare(`INSERT INTO trial_assignments (trial_code_id, lead_email, lead_name, campaign, code, status, trial_activated, activated_at)
        VALUES (?, ?, ?, 'worldcup_2026', ?, 'activated', 1, datetime('now'))`).run(trialCode.id, email, name || '', code);
      assignmentId = result.lastInsertRowid;
    }

    // Insert into demand_signals
    const existingLead = db.prepare("SELECT id FROM demand_signals WHERE email = ?").get(email);
    if (!existingLead) {
      db.prepare(`INSERT INTO demand_signals (source, source_name, content, author, email, intent_score, language, status)
        VALUES ('worldcup_trial', 'World Cup 2026 Landing', ?, ?, ?, 85, 'fr', 'new')`)
        .run(name || '', name || email.split('@')[0], email);
    }

    // Insert order for tracking
    db.prepare(`INSERT INTO orders (customer_name, customer_email, provider_id, plan_id, is_trial, trial_code_id, amount, status, source, created_at)
      VALUES (?, ?, ?, ?, 1, ?, 0, 'completed', 'worldcup_trial', datetime('now'))`)
      .run(name || '', email, trialCode.provider_id, 13, trialCode.id);

    const serverUrl = trialCode.server_url || 'http://dalletek.live:80';
    const m3uUrl = serverUrl + '/get.php?username=' + encodeURIComponent(trialCode.username) + '&password=' + encodeURIComponent(trialCode.password) + '&type=m3u_plus&output=ts';

    // Generate account password for dashboard login
    let accountPassword = null;
    try {
      const bcrypt = require('bcrypt');
      accountPassword = Math.random().toString(36).slice(-8) + String(Math.floor(Math.random() * 100));
      const db = getDb();
      let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (user) {
        const passwordHash = await bcrypt.hash(accountPassword, 10);
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, user.id);
      } else {
        const userResult = db.prepare(
          'INSERT INTO users (name, email, provider, preferred_app, website_id) VALUES (?, ?, ?, ?, ?)'
        ).run(name || email.split('@')[0], email, 'email', preferred_app || 'tivimate', 1);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(userResult.lastInsertRowid);
        const passwordHash = await bcrypt.hash(accountPassword, 10);
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, user.id);
      }
    } catch (e) {
      console.error('[Tracking] Account password error:', e);
    }

    // Send welcome email with credentials via emailService
    try {
      const emailService = require('../services/emailService');
      await emailService.sendTrial({
        email,
        name: name || 'Client',
        credentials: {
          username: trialCode.username,
          password: trialCode.password,
          server_url: serverUrl,
        },
        durationHours: trialCode.duration_hours || 24,
        providerName: 'Atlas',
        planName: 'Essai Gratuit',
        preferredApp: preferred_app || '',
        accountPassword,
      });
    } catch (emailErr) {
      console.error('[Trial] Welcome email failed:', emailErr.message);
    }

    res.json({
      success: true,
      username: trialCode.username,
      password: trialCode.password,
      server_url: serverUrl,
      m3u_url: m3uUrl,
      expires: expiresAt,
      code: trialCode.code,
    });

  } catch (e) {
    console.error('[Trial activation error]:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
