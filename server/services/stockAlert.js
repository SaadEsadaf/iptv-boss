const { getDb } = require('../db');
const { sendStockAlert } = require('./emailService');

function checkStock() {
  const db = getDb();
  const alerts = db.prepare('SELECT * FROM stock_alerts').all();

  for (const alert of alerts) {
    const row = db.prepare(
      'SELECT COUNT(*) as count FROM activation_codes WHERE provider_id = ? AND plan_id = ? AND status = ?'
    ).get(alert.provider_id, alert.plan_id, 'available');

    if (row.count <= alert.alert_threshold) {
      const lastAlert = alert.last_alert_sent ? new Date(alert.last_alert_sent) : null;
      const canSend = !lastAlert || (Date.now() - lastAlert.getTime()) > 24 * 60 * 60 * 1000;

      if (canSend && alert.email_alert) {
        const provider = db.prepare('SELECT name FROM providers_catalog WHERE id = ?').get(alert.provider_id);
        const plan = db.prepare('SELECT plan_name FROM provider_plans WHERE id = ?').get(alert.plan_id);
        const providerName = provider?.name || 'Unknown';
        const planName = plan?.plan_name || 'Unknown';

        sendStockAlert({
          providerName,
          planName,
          remaining: row.count,
          threshold: alert.alert_threshold,
        });

        db.prepare('UPDATE stock_alerts SET last_alert_sent = datetime(\'now\') WHERE id = ?').run(alert.id);

        db.prepare(
          'INSERT INTO agent_log (agent, action, details) VALUES (?, ?, ?)'
        ).run('System', 'stock_alert', `Low stock: ${providerName} ${planName} — ${row.count} left`);
      }
    }
  }
}

function startStockMonitor() {
  const cron = require('node-cron');
  cron.schedule('0 * * * *', () => {
    console.log('[StockMonitor] Checking stock levels...');
    try {
      checkStock();
    } catch (e) {
      console.error('[StockMonitor] Error:', e);
    }
  });
  console.log('[StockMonitor] Cron scheduled (hourly)');
}

module.exports = { checkStock, startStockMonitor };
