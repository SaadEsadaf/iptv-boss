const express = require('express');
const router = express.Router();
const trialEngine = require('../services/trialEngine');

// Create trial
router.post('/create', async (req, res) => {
  try {
    const result = await trialEngine.createTrial(req.body);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get trial stats
router.get('/stats', (req, res) => {
  try {
    const stats = trialEngine.getTrialStats();
    const conversions = trialEngine.getConversionStats();
    res.json({ trials: stats, conversions });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Send conversion email
router.post('/convert', async (req, res) => {
  try {
    const { email, name, offer } = req.body;
    await trialEngine.sendConversionEmail(email, name, offer);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Test trial: simulates a customer signing up
router.post('/test', async (req, res) => {
  try {
    const testEmail = req.body.email || 'test@luxstream.live';
    const testName = req.body.name || 'Test Client';
    
    const result = await trialEngine.createTrial({
      name: testName,
      email: testEmail,
      source: 'api_test',
      country: 'MA',
    });
    
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
