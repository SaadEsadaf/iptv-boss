const express = require('express');
const router = express.Router();
const intelligence = require('../services/titanIntelligence');

// Initialize
intelligence.init().catch(e => console.error('[TITAN-INTELLIGENCE] Init error:', e));

// === BRAIN CYCLE ===
router.post('/brain-cycle', async (req, res) => {
  try {
    const results = await intelligence.brainCycle();
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === VALIDATE LEADS ===
router.post('/validate', async (req, res) => {
  try {
    const { leadIds } = req.body;
    const results = await intelligence.validateLeads(leadIds);
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === DEEP ANALYZE ===
router.post('/analyze', async (req, res) => {
  try {
    const { leadIds } = req.body;
    const results = await intelligence.deepAnalyzeLeads(leadIds);
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === EXECUTE CAMPAIGNS ===
router.post('/execute', async (req, res) => {
  try {
    const { campaignType, maxLeads } = req.body;
    const results = await intelligence.executeCampaigns(campaignType, maxLeads || 50);
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === GENERATE INSIGHTS ===
router.post('/insights', async (req, res) => {
  try {
    const insights = await intelligence.generateBrainInsights();
    res.json({ insights });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === ADJUST STRATEGY ===
router.post('/strategy', async (req, res) => {
  try {
    const { insights } = req.body;
    const strategy = await intelligence.adjustStrategy(insights);
    res.json({ strategy });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === AUTO BRAIN ===
router.post('/auto-brain', async (req, res) => {
  try {
    intelligence.startAutoBrain();
    res.json({ status: 'auto-brain started', interval: '30 minutes' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === STATS ===
router.get('/stats', async (req, res) => {
  try {
    const stats = await intelligence.getBrainStats();
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === CYCLES ===
router.get('/cycles', async (req, res) => {
  try {
    const db = require('../db').getDb();
    const cycles = db.prepare('SELECT * FROM titan_brain_cycles ORDER BY id DESC LIMIT 20').all();
    res.json(cycles);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === VALIDATIONS ===
router.get('/validations', async (req, res) => {
  try {
    const db = require('../db').getDb();
    const validations = db.prepare(`
      SELECT v.*, l.username, l.platform, l.sentiment, l.intent_score
      FROM titan_lead_validation v
      JOIN growth_leads l ON v.lead_id = l.id
      ORDER BY v.id DESC
      LIMIT 100
    `).all();
    res.json(validations);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === CAMPAIGNS ===
router.get('/campaigns', async (req, res) => {
  try {
    const db = require('../db').getDb();
    const campaigns = db.prepare(`
      SELECT c.*, l.username, l.platform
      FROM titan_campaigns_executed c
      JOIN growth_leads l ON c.lead_id = l.id
      ORDER BY c.id DESC
      LIMIT 100
    `).all();
    res.json(campaigns);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === STRATEGIES ===
router.get('/strategies', async (req, res) => {
  try {
    const db = require('../db').getDb();
    const strategies = db.prepare('SELECT * FROM titan_strategies ORDER BY id DESC LIMIT 20').all();
    res.json(strategies);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
