const express = require('express');
const router = express.Router();
const { templateEngine, TEMPLATE_TYPES } = require('../services/titanTemplates');

// Initialize template engine
templateEngine.init().catch(e => console.error('[TITAN-TEMPLATES] Init error:', e));

// === TEMPLATE TYPES ===
router.get('/types', async (req, res) => {
  res.json(TEMPLATE_TYPES);
});

// === GENERATE TEMPLATE ===
router.post('/generate', async (req, res) => {
  try {
    const { type, prompt, variables = {} } = req.body;
    if (!type || !prompt) return res.status(400).json({ error: 'type and prompt required' });
    
    const template = await templateEngine.generateTemplate(type, prompt, variables);
    res.json(template);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === SAVE TEMPLATE ===
router.post('/save', async (req, res) => {
  try {
    const { name, type, content, variables = {}, metadata = {} } = req.body;
    if (!name || !type || !content) return res.status(400).json({ error: 'name, type, and content required' });
    
    const result = await templateEngine.saveTemplate(name, type, content, variables, metadata);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === GET TEMPLATES ===
router.get('/templates', async (req, res) => {
  try {
    const { type, active } = req.query;
    const templates = await templateEngine.getTemplates(type, active !== undefined ? active === 'true' : null);
    res.json(templates);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === GET SINGLE TEMPLATE ===
router.get('/templates/:id', async (req, res) => {
  try {
    const db = require('../db').getDb();
    const template = db.prepare('SELECT * FROM titan_templates WHERE id = ?').get(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json(template);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === DELETE TEMPLATE ===
router.delete('/templates/:id', async (req, res) => {
  try {
    const result = await templateEngine.deleteTemplate(req.params.id);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === RENDER TEMPLATE ===
router.post('/render', async (req, res) => {
  try {
    const { name, type, variables = {} } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'name and type required' });
    
    const rendered = await templateEngine.renderTemplate(name, type, variables);
    res.json({ rendered });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === INJECT TEMPLATE ===
router.post('/inject', async (req, res) => {
  try {
    const { templateId, target, position = 'append', conditions = {} } = req.body;
    if (!templateId || !target) return res.status(400).json({ error: 'templateId and target required' });
    
    const injection = await templateEngine.injectTemplate(templateId, target, position, conditions);
    res.json(injection);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === GET INJECTIONS ===
router.get('/injections', async (req, res) => {
  try {
    const { active } = req.query;
    const injections = await templateEngine.getInjections(active !== undefined ? active === 'true' : null);
    res.json(injections);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === DEACTIVATE INJECTION ===
router.post('/injections/:id/deactivate', async (req, res) => {
  try {
    const result = await templateEngine.deactivateInjection(req.params.id);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === A/B TESTS ===
router.post('/ab-tests', async (req, res) => {
  try {
    const { name, templateIds, trafficSplit } = req.body;
    if (!name || !templateIds || !Array.isArray(templateIds)) {
      return res.status(400).json({ error: 'name and templateIds array required' });
    }
    
    const test = await templateEngine.createABTest(name, templateIds, trafficSplit);
    res.json(test);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/ab-tests', async (req, res) => {
  try {
    const { status } = req.query;
    const tests = await templateEngine.getABTests(status);
    res.json(tests);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/ab-tests/:id/end', async (req, res) => {
  try {
    const { winnerId } = req.body;
    if (!winnerId) return res.status(400).json({ error: 'winnerId required' });
    
    const result = await templateEngine.endABTest(req.params.id, winnerId);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === ANALYTICS ===
router.get('/analytics/:templateId', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const analytics = await templateEngine.getAnalytics(req.params.templateId, parseInt(days));
    res.json(analytics);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === BULK GENERATE ===
router.post('/bulk-generate', async (req, res) => {
  try {
    const { campaignName, type, count = 5 } = req.body;
    if (!campaignName || !type) return res.status(400).json({ error: 'campaignName and type required' });
    
    const result = await templateEngine.bulkGenerateCampaign(campaignName, type, count);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === AUTO OPTIMIZE ===
router.post('/optimize/:templateId', async (req, res) => {
  try {
    const result = await templateEngine.autoOptimize(req.params.templateId);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === LOG EVENT ===
router.post('/log', async (req, res) => {
  try {
    const { templateId, injectionId, eventType, userId, sessionId, metadata = {} } = req.body;
    await templateEngine.logEvent(templateId, injectionId, eventType, userId, sessionId, metadata);
    res.json({ logged: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === GET A/B TEST VARIANT ===
router.post('/ab-test-variant', async (req, res) => {
  try {
    const { abTestId, userId } = req.body;
    if (!abTestId || !userId) return res.status(400).json({ error: 'abTestId and userId required' });
    
    const template = await templateEngine.getTemplateForABTest(abTestId, userId);
    res.json(template);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
