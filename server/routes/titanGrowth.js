const express = require('express');
const router = express.Router();
const growthEngine = require('../services/titanGrowth');

// Initialize
growthEngine.init().catch(e => console.error('[TITAN-GROWTH] Init error:', e));

// === DAILY PIPELINE ===
router.post('/pipeline', async (req, res) => {
  try {
    const results = await growthEngine.runDailyPipeline();
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === STATS ===
router.get('/stats', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const stats = await growthEngine.getStats(parseInt(days));
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === LEADS ===
router.get('/leads', async (req, res) => {
  try {
    const { status = 'new', limit = 100, offset = 0 } = req.query;
    const leads = await growthEngine.getLeads(status, parseInt(limit), parseInt(offset));
    res.json(leads);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === SCRAPE ===
router.post('/scrape/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    const { limit = 100 } = req.body;
    let leads = [];
    
    switch (platform) {
      case 'reddit': leads = await growthEngine.scrapeReddit(limit); break;
      case 'twitter': leads = await growthEngine.scrapeTwitter(limit); break;
      case 'youtube': leads = await growthEngine.scrapeYouTube(limit); break;
      case 'telegram': leads = await growthEngine.scrapeTelegram(limit); break;
      case 'forums': leads = await growthEngine.scrapeForums(limit); break;
      default: return res.status(400).json({ error: 'Unknown platform' });
    }
    
    res.json({ platform, leads: leads.length, data: leads });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === CAMPAIGNS ===
router.get('/campaigns', async (req, res) => {
  try {
    const campaigns = await growthEngine.getCampaigns();
    res.json(campaigns);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/campaigns', async (req, res) => {
  try {
    const { name, type, platform, target, content } = req.body;
    const campaign = await growthEngine.createCampaign(name, type, platform, target, content);
    res.json(campaign);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === CONTENT ===
router.get('/content', async (req, res) => {
  try {
    const { status = 'ready', limit = 50 } = req.query;
    const content = await growthEngine.getContent(status, parseInt(limit));
    res.json(content);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/content/generate', async (req, res) => {
  try {
    const { count = 50 } = req.body;
    const content = await growthEngine.generateDailyContent(count);
    res.json({ count: content.length, content });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === AFFILIATES ===
router.post('/affiliates', async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const affiliate = await growthEngine.registerAffiliate(name, email, phone);
    res.json(affiliate);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === MASS OUTREACH ===
router.post('/outreach', async (req, res) => {
  try {
    const { leadIds, template } = req.body;
    if (!leadIds || !Array.isArray(leadIds)) {
      return res.status(400).json({ error: 'leadIds array required' });
    }
    
    const results = await growthEngine.massOutreach(leadIds, template);
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === GENERATE OUTREACH MESSAGE ===
router.post('/outreach/message', async (req, res) => {
  try {
    const { lead, template } = req.body;
    const message = await growthEngine.generateOutreachMessage(lead, template);
    res.json({ message });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === AUTO MODE ===
router.post('/auto-mode', async (req, res) => {
  try {
    growthEngine.startAutoMode();
    res.json({ status: 'auto-mode started', interval: '4 hours' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
