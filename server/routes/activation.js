const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

const SETUP_GUIDES = {
  tivimate: {
    name: 'TiviMate',
    icon: '📱',
    steps: [
      'Download TiviMate from Google Play Store',
      'Open TiviMate → Add Playlist',
      'Select "M3U Playlist"',
      'Enter your M3U URL below',
      'Name it "LuxStream" and save',
      'Enjoy your channels!',
    ],
  },
  iptvsmarters: {
    name: 'IPTV Smarters Pro',
    icon: '📺',
    steps: [
      'Download IPTV Smarters Pro from store',
      'Open app → Login with Xtream Codes',
      'Enter: Server URL, Username, Password',
      'Click "Add User" → start watching',
    ],
  },
  vlc: {
    name: 'VLC Media Player',
    icon: '💻',
    steps: [
      'Open VLC on PC/Mac',
      'Click Media → Open Network Stream',
      'Paste your M3U URL',
      'Click Play → browse channels',
    ],
  },
  mag: {
    name: 'MAG Box',
    icon: '📦',
    steps: [
      'Go to Settings → Servers → Portals',
      'Enter Portal URL below',
      'Save and restart STB',
      'Wait for channels to load',
    ],
  },
  gse: {
    name: 'GSE Smart IPTV',
    icon: '🍎',
    steps: [
      'Download GSE Smart IPTV from App Store',
      'Open → Remote Playlists → Add M3U URL',
      'Enter your M3U URL',
      'Save → start watching',
    ],
  },
  smarttv: {
    name: 'Smart TV (Samsung/LG)',
    icon: '🖥️',
    steps: [
      'Go to App Store on your TV',
      'Install "IPTV Smarters" or "Smart IPTV"',
      'Open app → enter your credentials',
      'Load playlist → enjoy',
    ],
  },
};

// GET /api/activation/:token
// Returns order/trial credentials and setup info
router.get('/:token', (req, res) => {
  const db = getDb();
  const { token } = req.params;

  const orderId = parseInt(token);
  const order = Number.isFinite(orderId) ? db.prepare(`
    SELECT o.*, pc.name as provider_name, pp.plan_name, pp.duration_days, pp.price_sell
    FROM orders o
    JOIN providers_catalog pc ON o.provider_id = pc.id
    JOIN provider_plans pp ON o.plan_id = pp.id
    WHERE o.id = ?
  `).get(orderId) : null;

  const trial = !order ? db.prepare(`
    SELECT tc.*, pc.name as provider_name
    FROM trial_codes tc
    JOIN providers_catalog pc ON tc.provider_id = pc.id
    WHERE tc.email = ?
  `).get(token) : null;

  const record = order || trial;
  if (!record) {
    return res.status(404).json({ error: 'Not found' });
  }

  let username = record.username;
  let password = record.password;
  let serverUrl = record.server_url || 'http://appley.site';
  let portalUrl = `${serverUrl}/c/`;

  if (order) {
    const code = db.prepare('SELECT * FROM activation_codes WHERE id = ?').get(order.activation_code_id);
    if (code) {
      username = code.username || username;
      password = code.password || password;
      serverUrl = code.server_url || serverUrl;
      portalUrl = `${serverUrl}/c/`;
    }
  }

  const m3uUrl = `${serverUrl}/get.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&type=m3u&output=ts`;
  const apiUrl = `${serverUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;

  const planName = order ? record.plan_name : 'Essai gratuit';
  res.json({
    type: order ? 'order' : 'trial',
    status: record.status,
    provider: record.provider_name,
    plan: planName,
    duration: record.duration_days || (record.duration_hours ? `${record.duration_hours}h` : null),
    expires: record.expires_at,
    credentials: {
      username,
      password,
      server_url: serverUrl,
      portal_url: portalUrl,
      m3u_url: m3uUrl,
      api_url: apiUrl,
    },
    guides: SETUP_GUIDES,
  });
});

// GET /api/activation/:token/setup
router.get('/:token/setup', (req, res) => {
  res.json({ guides: SETUP_GUIDES });
});

module.exports = router;
