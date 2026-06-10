const express = require('express');
const router = express.Router();
const { titan } = require('../services/titanHub');
const titanSecurity = require('../services/titanSecurity');
const titanScanner = require('../services/titanScanner');
const { getDb } = require('../db');

// Initialize Titan on startup
titan.init().catch(e => console.error('[TITAN-ROUTE] Init error:', e));

// === CHAT ===
router.post('/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });
    
    const response = await titan.chat(message, history);
    res.json({ response, timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === SYSTEM STATUS ===
router.get('/status', async (req, res) => {
  try {
    const db = getDb();
    const state = await titan.getSystemState(db);
    res.json(state);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === COMMAND EXECUTION ===
router.post('/command', async (req, res) => {
  try {
    const { command, args = {} } = req.body;
    if (!command) return res.status(400).json({ error: 'Command required' });
    
    const result = await titan.executeCommand(command, args);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === SECURITY SCAN ===
router.get('/security/scan', async (req, res) => {
  try {
    const results = await titanSecurity.scan();
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/security/fix', async (req, res) => {
  try {
    const { issueId } = req.body;
    const result = await titanSecurity.fixIssue(issueId);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === CUSTOMER SCANNER ===
router.get('/scanner/scan', async (req, res) => {
  try {
    const { platform = 'all' } = req.query;
    const results = await titanScanner.findProspects(platform);
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/scanner/prospects', async (req, res) => {
  try {
    const { status = 'new', limit = 50 } = req.query;
    const prospects = await titanScanner.getProspects(status, parseInt(limit));
    res.json(prospects);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/scanner/prospects/:id/contact', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const result = await titanScanner.markContacted(id, notes);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/scanner/outreach', async (req, res) => {
  try {
    const { prospect } = req.body;
    const message = await titanScanner.generateOutreachMessage(prospect);
    res.json({ message });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/scanner/trends', async (req, res) => {
  try {
    const trends = await titanScanner.scanTrends();
    res.json(trends);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === CODE GENERATION ===
router.post('/generate-code', async (req, res) => {
  try {
    const { feature, description } = req.body;
    const code = await titan.generateCode(feature, description);
    res.json({ code });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === CONVERSATION ANALYSIS ===
router.post('/analyze-conversations', async (req, res) => {
  try {
    const { conversations } = req.body;
    const analysis = await titan.analyzeConversation(conversations);
    res.json({ analysis });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === SALES STRATEGY ===
router.post('/optimize-sales', async (req, res) => {
  try {
    const { type } = req.body;
    const strategy = await titan.optimizeSalesSequence(type);
    res.json({ strategy });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === AGENT DIRECTIVES ===
router.post('/feed-chat-agent', async (req, res) => {
  try {
    const { directive } = req.body;
    const result = await titan.feedChatAgent(directive);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/feed-sales-agent', async (req, res) => {
  try {
    const { strategy } = req.body;
    const result = await titan.feedSalesAgent(strategy);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === TITAN MEMORY ===
router.get('/memory', async (req, res) => {
  res.json({ memory: titan.memory });
});

// === AGENTS STATUS ===
router.get('/agents', async (req, res) => {
  res.json({
    agents: {
      titan: { status: titan.isRunning ? 'online' : 'offline', model: 'titan-v2:latest' },
      chat: { status: 'online', name: 'Alex' },
      sales: { status: 'online', name: 'Sales Engine' },
      security: { status: 'online', name: 'Security Scanner' },
      scanner: { status: 'online', name: 'Customer Scout' },
      build: { status: 'online', name: 'Build Agent' },
    },
  });
});

module.exports = router;
