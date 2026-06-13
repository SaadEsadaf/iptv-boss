function assignCode(orderId, providerId, planId) {
  const { getDb } = require('../db');
  const db = getDb();

  const code = db.prepare(
    'SELECT * FROM activation_codes WHERE provider_id = ? AND plan_id = ? AND status = ? ORDER BY id LIMIT 1'
  ).get(providerId, planId, 'available');

  if (!code) return null;

  db.prepare(
    "UPDATE activation_codes SET status = 'used', used_by_order_id = ?, assigned_at = datetime('now') WHERE id = ?"
  ).run(orderId, code.id);

  return {
    code: code.code,
    username: code.username,
    password: code.password,
    server_url: code.server_url,
    mac_address: code.mac_address,
    expires_at: code.expires_at,
  };
}

function assignTrial(orderId, providerId) {
  const { getDb } = require('../db');
  const db = getDb();

  const trial = db.prepare(
    'SELECT * FROM trial_codes WHERE provider_id = ? AND status = ? ORDER BY id LIMIT 1'
  ).get(providerId, 'available');

  if (!trial) return null;

  const durationHours = trial.duration_hours || 24;
  const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();

  db.prepare(
    "UPDATE trial_codes SET status = 'used', used_by_order_id = ?, assigned_at = datetime('now'), expires_at = ? WHERE id = ?"
  ).run(orderId, expiresAt, trial.id);

  return {
    code: trial.code,
    username: trial.username,
    password: trial.password,
    server_url: trial.server_url,
    duration_hours: durationHours,
    expires_at: expiresAt,
  };
}

function countAvailable(providerId, planId) {
  const { getDb } = require('../db');
  const db = getDb();
  const row = db.prepare(
    'SELECT COUNT(*) as count FROM activation_codes WHERE provider_id = ? AND plan_id = ? AND status = ?'
  ).get(providerId, planId, 'available');
  return row.count;
}

function countAvailableTrials(providerId) {
  const { getDb } = require('../db');
  const db = getDb();
  const row = db.prepare(
    'SELECT COUNT(*) as count FROM trial_codes WHERE provider_id = ? AND status = ?'
  ).get(providerId, 'available');
  return row.count;
}

module.exports = { assignCode, assignTrial, countAvailable, countAvailableTrials };
