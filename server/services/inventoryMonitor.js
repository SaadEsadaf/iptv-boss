const { getDb } = require('../db');
const axios = require('axios');

/**
 * INVENTORY MONITOR SERVICE
 * 
 * Periodically checks stock levels and sends alerts when inventory is low.
 * Supports multiple notification channels: email, Telegram, webhook, in-app.
 */

class InventoryMonitor {
  constructor() {
    this.interval = null;
    this.checkInterval = 5 * 60 * 1000; // 5 minutes default
    this.alertHistory = new Map(); // Track last alert per provider to prevent spam
  }

  start() {
    this.checkInterval = this.getCheckInterval();
    this.runCheck();
    this.interval = setInterval(() => this.runCheck(), this.checkInterval);
    console.log(`[INVENTORY-MONITOR] Started monitoring every ${this.checkInterval / 1000}s`);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    console.log('[INVENTORY-MONITOR] Stopped monitoring.');
  }

  getCheckInterval() {
    const db = getDb();
    const row = db.prepare("SELECT value FROM app_settings WHERE key = 'inventory_check_interval'").get();
    return row ? parseInt(row.value) * 1000 : 5 * 60 * 1000; // default 5 minutes
  }

  async runCheck() {
    const db = getDb();
    const providers = db.prepare('SELECT * FROM providers_catalog WHERE active = 1').all();
    
    const results = {
      checked: 0,
      alerts: [],
      notifications: [],
    };

    for (const provider of providers) {
      // Check activation codes
      const activationAvailable = db.prepare(
        "SELECT COUNT(*) as count FROM activation_codes WHERE provider_id = ? AND status = 'available'"
      ).get(provider.id).count;
      
      const activationThreshold = db.prepare(
        "SELECT alert_threshold FROM stock_alerts WHERE provider_id = ? AND (type = 'activation' OR type IS NULL) LIMIT 1"
      ).get(provider.id)?.alert_threshold || 5;

      // Check trial codes
      const trialAvailable = db.prepare(
        "SELECT COUNT(*) as count FROM trial_codes WHERE provider_id = ? AND status = 'available'"
      ).get(provider.id).count;
      
      const trialThreshold = db.prepare(
        "SELECT alert_threshold FROM stock_alerts WHERE provider_id = ? AND type = 'trial' LIMIT 1"
      ).get(provider.id)?.alert_threshold || 5;

      results.checked++;

      // Check activation codes
      if (activationAvailable <= activationThreshold) {
        const alert = {
          providerId: provider.id,
          providerName: provider.name,
          type: 'activation',
          current: activationAvailable,
          threshold: activationThreshold,
          urgent: activationAvailable === 0,
          timestamp: new Date().toISOString(),
        };
        results.alerts.push(alert);
        
        // Send notification if not recently alerted
        if (this.shouldNotify(alert)) {
          await this.sendNotification(alert);
          results.notifications.push(alert);
          this.markNotified(alert);
        }
      }

      // Check trial codes
      if (trialAvailable <= trialThreshold) {
        const alert = {
          providerId: provider.id,
          providerName: provider.name,
          type: 'trial',
          current: trialAvailable,
          threshold: trialThreshold,
          urgent: trialAvailable === 0,
          timestamp: new Date().toISOString(),
        };
        results.alerts.push(alert);
        
        if (this.shouldNotify(alert)) {
          await this.sendNotification(alert);
          results.notifications.push(alert);
          this.markNotified(alert);
        }
      }
    }

    // Log check
    if (results.alerts.length > 0) {
      console.log(`[INVENTORY-MONITOR] ${results.alerts.length} alerts found, ${results.notifications.length} sent`);
      for (const alert of results.alerts) {
        console.log(`[INVENTORY-MONITOR] ${alert.providerName} ${alert.type}: ${alert.current}/${alert.threshold} ${alert.urgent ? 'URGENT' : ''}`);
      }
    }

    return results;
  }

  shouldNotify(alert) {
    const key = `${alert.providerId}_${alert.type}`;
    const lastAlert = this.alertHistory.get(key);
    if (!lastAlert) return true;
    
    // Don't alert more than once per hour for non-urgent
    const cooldown = alert.urgent ? 10 * 60 * 1000 : 60 * 60 * 1000; // 10 min urgent, 1 hour normal
    return (Date.now() - lastAlert) > cooldown;
  }

  markNotified(alert) {
    const key = `${alert.providerId}_${alert.type}`;
    this.alertHistory.set(key, Date.now());
  }

  async sendNotification(alert) {
    const db = getDb();
    const settings = db.prepare("SELECT * FROM app_settings WHERE key LIKE 'notification_%'").all();
    const config = {};
    for (const s of settings) config[s.key] = s.value;

    const message = this.buildMessage(alert);
    
    // Send to all configured channels
    const promises = [];
    
    if (config.notification_email) {
      promises.push(this.sendEmail(config.notification_email, alert, message));
    }
    
    if (config.notification_telegram) {
      promises.push(this.sendTelegram(config.notification_telegram, alert, message));
    }
    
    if (config.notification_webhook) {
      promises.push(this.sendWebhook(config.notification_webhook, alert, message));
    }
    
    // Always store in-app notification
    this.storeInAppNotification(alert, message);
    
    if (promises.length > 0) {
      await Promise.allSettled(promises);
    }
  }

  buildMessage(alert) {
    const urgency = alert.urgent ? 'URGENT' : 'WARNING';
    const type = alert.type === 'activation' ? 'Activation Codes' : 'Trial Codes';
    const action = alert.urgent ? 'Add codes immediately! Service may be interrupted.' : 'Consider adding more codes soon.';
    
    return {
      subject: `[${urgency}] ${alert.providerName} - ${type} Low Stock`,
      body: `${urgency}: ${alert.providerName} ${type} is running low.\n\nCurrent stock: ${alert.current}\nThreshold: ${alert.threshold}\n\n${action}\n\nTime: ${new Date().toLocaleString()}`,
      short: `${urgency}: ${alert.providerName} ${type}: ${alert.current} remaining (threshold: ${alert.threshold})`,
    };
  }

  async sendEmail(email, alert, message) {
    try {
      const { getTransporter } = require('./emailService');
      const transporter = getTransporter();
      if (!transporter) {
        console.log('[INVENTORY-MONITOR] Email not configured');
        return;
      }
      
      await transporter.sendMail({
        from: '"IPTV Boss" <noreply@dalletek.live>',
        to: email,
        subject: message.subject,
        text: message.body,
        html: `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;border:1px solid #ddd;border-radius:8px;">
          <h2 style="color:${alert.urgent ? '#ff4444' : '#ffd700'};margin:0 0 10px;">${alert.urgent ? 'URGENT' : 'WARNING'}</h2>
          <p style="color:#333;font-size:14px;">${alert.providerName} <strong>${alert.type === 'activation' ? 'Activation Codes' : 'Trial Codes'}</strong> is running low.</p>
          <div style="background:#f5f5f5;padding:15px;border-radius:6px;margin:15px 0;">
            <div style="font-size:28px;font-weight:700;color:#00d4ff;">${alert.current}</div>
            <div style="font-size:12px;color:#666;">Current Stock</div>
          </div>
          <div style="font-size:12px;color:#666;">Threshold: ${alert.threshold}</div>
          <div style="margin-top:15px;font-size:12px;color:#666;">${alert.urgent ? 'Add codes immediately! Service may be interrupted.' : 'Consider adding more codes soon.'}</div>
          <div style="margin-top:15px;font-size:11px;color:#999;">IPTV Boss - ${new Date().toLocaleString()}</div>
        </div>`,
      });
      console.log(`[INVENTORY-MONITOR] Email sent to ${email}`);
    } catch (e) {
      console.error('[INVENTORY-MONITOR] Email failed:', e.message);
    }
  }

  async sendTelegram(telegramToken, alert, message) {
    try {
      const token = telegramToken;
      const chatId = await this.getTelegramChatId(token);
      if (!chatId) {
        console.log('[INVENTORY-MONITOR] Telegram chat ID not found');
        return;
      }
      
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId,
        text: message.short,
        parse_mode: 'HTML',
      }, { timeout: 10000 });
      console.log('[INVENTORY-MONITOR] Telegram sent');
    } catch (e) {
      console.error('[INVENTORY-MONITOR] Telegram failed:', e.message);
    }
  }

  async getTelegramChatId(token) {
    try {
      const res = await axios.get(`https://api.telegram.org/bot${token}/getUpdates`, { timeout: 10000 });
      const updates = res.data?.result || [];
      if (updates.length > 0) {
        return updates[0].message?.chat?.id;
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  async sendWebhook(webhookUrl, alert, message) {
    try {
      await axios.post(webhookUrl, {
        event: 'inventory.low_stock',
        provider: alert.providerName,
        type: alert.type,
        current: alert.current,
        threshold: alert.threshold,
        urgent: alert.urgent,
        message: message.short,
        timestamp: alert.timestamp,
      }, { timeout: 10000 });
      console.log('[INVENTORY-MONITOR] Webhook sent');
    } catch (e) {
      console.error('[INVENTORY-MONITOR] Webhook failed:', e.message);
    }
  }

  storeInAppNotification(alert, message) {
    const db = getDb();
    db.prepare(`
      INSERT INTO admin_notifications (type, title, message, related_id, read, created_at)
      VALUES (?, ?, ?, ?, 0, datetime('now'))
    `).run(
      alert.urgent ? 'urgent_stock' : 'stock_alert',
      message.subject,
      message.short,
      alert.providerId
    );
  }

  // Get current inventory status
  getInventoryStatus() {
    const db = getDb();
    const providers = db.prepare('SELECT * FROM providers_catalog WHERE active = 1').all();
    const status = [];

    for (const provider of providers) {
      const activation = {
        available: db.prepare("SELECT COUNT(*) as count FROM activation_codes WHERE provider_id = ? AND status = 'available'").get(provider.id).count,
        sold: db.prepare("SELECT COUNT(*) as count FROM activation_codes WHERE provider_id = ? AND status = 'sold'").get(provider.id).count,
        total: db.prepare("SELECT COUNT(*) as count FROM activation_codes WHERE provider_id = ?").get(provider.id).count,
      };
      
      const trials = {
        available: db.prepare("SELECT COUNT(*) as count FROM trial_codes WHERE provider_id = ? AND status = 'available'").get(provider.id).count,
        used: db.prepare("SELECT COUNT(*) as count FROM trial_codes WHERE provider_id = ? AND status = 'used'").get(provider.id).count,
        total: db.prepare("SELECT COUNT(*) as count FROM trial_codes WHERE provider_id = ?").get(provider.id).count,
      };

      const activationThreshold = db.prepare(
        "SELECT alert_threshold FROM stock_alerts WHERE provider_id = ? AND (type = 'activation' OR type IS NULL) LIMIT 1"
      ).get(provider.id)?.alert_threshold || 5;
      
      const trialThreshold = db.prepare(
        "SELECT alert_threshold FROM stock_alerts WHERE provider_id = ? AND type = 'trial' LIMIT 1"
      ).get(provider.id)?.alert_threshold || 5;

      status.push({
        provider: provider,
        activation: { ...activation, threshold: activationThreshold, low: activation.available <= activationThreshold },
        trials: { ...trials, threshold: trialThreshold, low: trials.available <= trialThreshold },
      });
    }

    return status;
  }

  // Set thresholds
  setThreshold(providerId, type, threshold) {
    const db = getDb();
    // Check if record exists
    const existing = db.prepare("SELECT id FROM stock_alerts WHERE provider_id = ? AND (type = ? OR type IS NULL) LIMIT 1").get(providerId, type);
    if (existing) {
      db.prepare("UPDATE stock_alerts SET alert_threshold = ?, type = ?, updated_at = datetime('now') WHERE id = ?").run(threshold, type, existing.id);
    } else {
      db.prepare("INSERT INTO stock_alerts (provider_id, type, alert_threshold, updated_at) VALUES (?, ?, ?, datetime('now'))").run(providerId, type, threshold);
    }
    return { success: true };
  }

  // Set notification preferences
  setNotificationSettings(settings) {
    const db = getDb();
    for (const [key, value] of Object.entries(settings)) {
      db.prepare(`
        INSERT INTO app_settings (key, value, updated_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')
      `).run(`notification_${key}`, value, value);
    }
    return { success: true };
  }

  // Get notification settings
  getNotificationSettings() {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM app_settings WHERE key LIKE 'notification_%'").all();
    const settings = {};
    for (const row of rows) {
      const key = row.key.replace('notification_', '');
      settings[key] = row.value;
    }
    return settings;
  }

  // Get recent notifications
  getRecentNotifications(limit = 20) {
    const db = getDb();
    return db.prepare(`
      SELECT * FROM admin_notifications
      WHERE type IN ('stock_alert', 'urgent_stock')
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit);
  }

  // Mark notifications as read
  markNotificationsRead(ids) {
    const db = getDb();
    if (ids === 'all') {
      db.prepare("UPDATE admin_notifications SET read = 1 WHERE type IN ('stock_alert', 'urgent_stock')").run();
    } else {
      db.prepare(`UPDATE admin_notifications SET read = 1 WHERE id IN (${ids.join(',')})`).run();
    }
    return { success: true };
  }

  // Get unread count
  getUnreadCount() {
    const db = getDb();
    return db.prepare("SELECT COUNT(*) as count FROM admin_notifications WHERE read = 0 AND type IN ('stock_alert', 'urgent_stock')").get().count;
  }

  // Manual trigger check
  async manualCheck() {
    return await this.runCheck();
  }
}

module.exports = new InventoryMonitor();
