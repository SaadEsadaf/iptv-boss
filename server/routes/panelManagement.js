const express = require('express');
const router = express.Router();
const panelManager = require('../services/panelManager');
const contentEngine = require('../services/contentEngine');
const m3uParser = require('../services/m3uParser');

// ==================== PANEL MANAGEMENT ====================

// Get all panels with stats
router.get('/panels', async (req, res) => {
  try {
    const panels = panelManager.getPanelsWithStats();
    const alerts = panelManager.getStockAlerts();
    res.json({ panels, alerts });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get single panel with stats
router.get('/panels/:id', async (req, res) => {
  try {
    const panels = panelManager.getPanelsWithStats();
    const panel = panels.find(p => p.id === parseInt(req.params.id));
    if (!panel) return res.status(404).json({ error: 'Panel not found' });
    res.json(panel);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create/update panel
router.post('/panels', async (req, res) => {
  try {
    const { id, name, panel_url, panel_username, panel_password, website, notes, active } = req.body;
    const panel = await panelManager.savePanel({ id, name, panel_url, panel_username, panel_password, website, notes, active });
    res.json(panel);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete panel
router.delete('/panels/:id', async (req, res) => {
  try {
    const { getDb } = require('../db');
    const db = getDb();
    db.prepare('UPDATE providers_catalog SET active = 0 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Sync panel with Atlas
router.post('/panels/:id/sync', async (req, res) => {
  try {
    const result = await panelManager.syncAtlasPanel(req.params.id);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Add activation codes
router.post('/panels/:id/codes', async (req, res) => {
  try {
    const { planId, codes } = req.body;
    const result = await panelManager.addActivationCodes(req.params.id, planId, codes);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Add trial codes
router.post('/panels/:id/trial-codes', async (req, res) => {
  try {
    const { codes, durationHours } = req.body;
    const result = await panelManager.addTrialCodes(req.params.id, codes, durationHours || 24);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get stock alerts
router.get('/alerts', async (req, res) => {
  try {
    const alerts = panelManager.getStockAlerts();
    res.json({ alerts });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== M3U CONTENT ====================

// Save M3U sample URL
router.post('/m3u', async (req, res) => {
  try {
    const { providerId, m3uUrl } = req.body;
    const result = await contentEngine.saveM3USample(providerId, m3uUrl);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get M3U data
router.get('/m3u/:providerId', async (req, res) => {
  try {
    const data = contentEngine.getM3UData(req.params.providerId);
    res.json({ data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Parse M3U URL
router.post('/m3u/parse', async (req, res) => {
  try {
    const { url } = req.body;
    const data = await m3uParser.fetchM3U(url);
    if (data) {
      res.json({
        success: true,
        stats: data.stats,
        sports: data.sportsEvents?.slice(0, 10),
        movies: data.movies?.slice(0, 10),
        series: data.series?.slice(0, 10),
        groups: data.groups?.slice(0, 10),
      });
    } else {
      res.status(400).json({ error: 'Failed to parse M3U' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== WEBSITE CONTENT ====================

// Get website content for a provider
router.get('/content/:websiteId/:providerId', async (req, res) => {
  try {
    const { websiteId, providerId } = req.params;
    const content = await contentEngine.getWebsiteContent(websiteId, providerId);
    res.json(content);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get content for current website (public)
router.get('/content', async (req, res) => {
  try {
    const { website_id } = req.query;
    const { getDb } = require('../db');
    const db = getDb();
    
    // Get provider for this website
    const provider = db.prepare('SELECT * FROM providers_catalog WHERE active = 1 LIMIT 1').get();
    if (!provider) return res.json({ error: 'No provider configured' });
    
    const content = await contentEngine.getWebsiteContent(website_id || 1, provider.id);
    res.json(content);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== STATS ====================

// Get dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const { getDb } = require('../db');
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    
    const stats = {
      panels: db.prepare('SELECT COUNT(*) as count FROM providers_catalog WHERE active = 1').get().count,
      activationCodes: db.prepare("SELECT COUNT(*) as count FROM activation_codes WHERE status = 'available'").get().count,
      trialCodes: db.prepare("SELECT COUNT(*) as count FROM trial_codes WHERE status = 'available'").get().count,
      activationSoldToday: db.prepare(`SELECT COUNT(*) as count FROM activation_codes WHERE status = 'sold' AND assigned_at LIKE ?`).get(`${today}%`).count,
      trialSentToday: db.prepare(`SELECT COUNT(*) as count FROM trial_codes WHERE status = 'used' AND assigned_at LIKE ?`).get(`${today}%`).count,
      ordersToday: db.prepare(`SELECT COUNT(*) as count FROM orders WHERE created_at LIKE ?`).get(`${today}%`).count,
      revenueToday: db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE status = 'paid' AND created_at LIKE ?`).get(`${today}%`).total,
    };
    
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
