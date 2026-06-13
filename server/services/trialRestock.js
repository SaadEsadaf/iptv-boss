const { getDb } = require('../db');

async function autoExpireTrials() {
  const db = getDb();
  const now = new Date().toISOString();

  // Mark expired trials
  const expired = db.prepare(`
    UPDATE trial_codes SET status = 'expired'
    WHERE status = 'available' AND expires_at IS NOT NULL AND expires_at < ?
  `).run(now);

  // Mark trials older than 36h as expired even without explicit expires_at
  const staleCutoff = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();
  const staleExpired = db.prepare(`
    UPDATE trial_codes SET status = 'expired'
    WHERE status = 'available' AND added_at < ? AND expires_at IS NULL
  `).run(staleCutoff);

  if (expired.changes > 0 || staleExpired.changes > 0) {
    console.log(`[Trial-Restock] Expired ${expired.changes + staleExpired.changes} trial codes`);
  }

  return { expired: expired.changes + staleExpired.changes };
}

async function checkLowStock() {
  const db = getDb();
  const providers = db.prepare('SELECT id, name FROM providers_catalog WHERE active = 1').all();
  const alerts = [];

  for (const p of providers) {
    const trialCount = db.prepare(
      "SELECT COUNT(*) as c FROM trial_codes WHERE provider_id = ? AND status = 'available'"
    ).get(p.id).c;

    const activationLow = db.prepare(`
      SELECT pp.plan_name, COUNT(ac.id) as available
      FROM provider_plans pp
      LEFT JOIN activation_codes ac ON ac.plan_id = pp.id AND ac.status = 'available'
      WHERE pp.provider_id = ? AND pp.plan_type != 'trial'
      GROUP BY pp.id, pp.plan_name
      HAVING available < pp.min_stock
    `).all(p.id);

    if (trialCount < 5) {
      alerts.push({ provider: p.name, type: 'trial', remaining: trialCount });
      // Insert admin notification
      db.prepare(
        "INSERT INTO admin_notifications (type, title, message, related_id) VALUES (?, ?, ?, ?)"
      ).run('restock_alert', `Trial codes low for ${p.name}`,
        `Only ${trialCount} trial codes remaining for ${p.name}. Need to restock.`, p.id);
    }

    for (const a of activationLow) {
      alerts.push({ provider: p.name, plan: a.plan_name, remaining: a.available });
      db.prepare(
        "INSERT INTO admin_notifications (type, title, message, related_id) VALUES (?, ?, ?, ?)"
      ).run('restock_alert', `Low stock: ${p.name} ${a.plan_name}`,
        `Only ${a.available} codes remaining for ${p.name} ${a.plan_name}.`, p.id);
    }
  }

  return alerts;
}

async function restockTrials(providerId, codes) {
  const db = getDb();
  let count = 0;

  for (const code of codes) {
    db.prepare(`
      INSERT INTO trial_codes (provider_id, code, username, password, server_url, duration_hours, expires_at, status)
      VALUES (?, ?, ?, ?, ?, 24, datetime('now', '+24 hours'), 'available')
    `).run(providerId, code.code || code, code.username || '', code.password || '', code.server_url || '');

    // Try to set panel credentials
    const lastId = db.prepare('SELECT last_insert_rowid() as id').get().id;
    if (code.username && !code.server_url) {
      const provider = db.prepare('SELECT panel_url FROM providers_catalog WHERE id = ?').get(providerId);
      if (provider?.panel_url) {
        db.prepare('UPDATE trial_codes SET server_url = ?, username = ?, password = ? WHERE id = ?')
          .run(provider.panel_url, code.username, code.password, lastId);
      }
    }
    count++;
  }

  db.prepare(
    "INSERT INTO admin_notifications (type, title, message, related_id) VALUES (?, ?, ?, ?)"
  ).run('restock_done', `Restocked ${count} trial codes`,
    `Added ${count} trial codes for provider #${providerId}.`, providerId);

  return count;
}

module.exports = { autoExpireTrials, checkLowStock, restockTrials };