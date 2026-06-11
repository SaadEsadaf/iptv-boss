const express = require('express');
const router = express.Router();
const inventoryMonitor = require('../services/inventoryMonitor');

// Get inventory status for all providers
router.get('/status', (req, res) => {
  try {
    const status = inventoryMonitor.getInventoryStatus();
    res.json({ status });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Manual check trigger
router.post('/check', async (req, res) => {
  try {
    const result = await inventoryMonitor.manualCheck();
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Set threshold for a provider
router.post('/threshold', (req, res) => {
  try {
    const { providerId, type, threshold } = req.body;
    if (!providerId || !type || threshold === undefined) {
      return res.status(400).json({ error: 'providerId, type, and threshold required' });
    }
    const result = inventoryMonitor.setThreshold(providerId, type, threshold);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get notification settings
router.get('/settings', (req, res) => {
  try {
    const settings = inventoryMonitor.getNotificationSettings();
    res.json({ settings });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update notification settings
router.post('/settings', (req, res) => {
  try {
    const settings = req.body;
    const result = inventoryMonitor.setNotificationSettings(settings);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get recent notifications
router.get('/notifications', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const notifications = inventoryMonitor.getRecentNotifications(limit);
    const unread = inventoryMonitor.getUnreadCount();
    res.json({ notifications, unread });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Mark notifications as read
router.post('/notifications/read', (req, res) => {
  try {
    const { ids } = req.body;
    inventoryMonitor.markNotificationsRead(ids || 'all');
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get unread count
router.get('/notifications/unread', (req, res) => {
  try {
    const count = inventoryMonitor.getUnreadCount();
    res.json({ count });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
