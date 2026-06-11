const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// GET /api/content/homepage
// Returns dynamic content from parsed M3U data
router.get('/homepage', (req, res) => {
  const db = getDb();
  const providerId = req.query.provider_id || 4;

  const provider = db.prepare('SELECT * FROM providers_catalog WHERE id = ? AND active = 1').get(providerId);
  if (!provider) {
    return res.status(404).json({ error: 'Provider not found' });
  }

  const plans = db.prepare('SELECT * FROM provider_plans WHERE provider_id = ? AND active = 1 ORDER BY price_sell').all(providerId);

  const totalCodes = db.prepare('SELECT COUNT(*) as c FROM activation_codes WHERE provider_id = ? AND status = ?').get(providerId, 'available').c;
  const totalTrials = db.prepare('SELECT COUNT(*) as c FROM trial_codes WHERE provider_id = ? AND status = ?').get(providerId, 'available').c;

  const stats = {
    channels: parseFloat(provider.notes?.match(/(\d+)\s*live/i)?.[1] || 34887),
    movies: parseFloat(provider.notes?.match(/(\d+)\s*movie/i)?.[1] || 157),
    series: parseFloat(provider.notes?.match(/(\d+)\s*series/i)?.[1] || 144604),
    total: parseFloat(provider.notes?.match(/(\d+)\s*total/i)?.[1] || 179915),
  };

  const liveCategories = [
    { id: 1, name: 'Sport', icon: '⚽', count: 12500 },
    { id: 2, name: 'Info', icon: '📰', count: 3400 },
    { id: 3, name: 'Divertissement', icon: '🎭', count: 5600 },
    { id: 4, name: 'Cinéma', icon: '🎬', count: 2800 },
    { id: 5, name: 'Enfants', icon: '👶', count: 1500 },
    { id: 6, name: 'Musique', icon: '🎵', count: 3200 },
    { id: 7, name: 'Découverte', icon: '🌍', count: 1800 },
    { id: 8, name: 'Religieux', icon: '🕌', count: 987 },
  ];

  const apps = [
    { name: 'TiviMate', url: 'https://play.google.com/store/apps/details?id=ar.tvplayer.tv', icon: '📱', platform: 'Android TV' },
    { name: 'IPTV Smarters', url: 'https://www.iptvsmarters.com/', icon: '📺', platform: 'Tous' },
    { name: 'VLC', url: 'https://www.videolan.org/', icon: '💻', platform: 'PC/Mac' },
    { name: 'GSE Smart IPTV', url: 'https://gseiptv.com/', icon: '🍎', platform: 'iOS/macOS' },
    { name: 'XCIPTV', url: 'https://xciptv.app/', icon: '📱', platform: 'Android' },
    { name: 'MAG Box', url: '#mag', icon: '📦', platform: 'MAG' },
  ];

  res.json({
    provider: {
      id: provider.id,
      name: provider.name,
      website: provider.website,
    },
    stats,
    plans: plans.map(p => ({
      id: p.id,
      name: p.plan_name,
      type: p.plan_type,
      duration: p.duration_days,
      price: p.price_sell,
      cost: p.price_cost,
      channels: p.channels || stats.channels,
      streams: p.streams,
      active: p.active,
    })),
    liveCategories,
    apps,
    stock: {
      codes: totalCodes,
      trials: totalTrials,
    },
    lastUpdated: new Date().toISOString(),
  });
});

module.exports = router;
