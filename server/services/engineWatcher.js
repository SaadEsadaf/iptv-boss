const crypto = require('crypto');
const { getDb } = require('../db');

const ENGINES = [
  { name: 'business', url: 'http://localhost:3001', path: '/api/internal/health' },
  { name: 'marketing', url: 'http://localhost:3002', path: '/api/internal/health' },
  { name: 'payment', url: process.env.PAYMENT_ENGINE_URL || 'http://localhost:3004', path: '/api/internal/health' },
];

function getSecret() {
  const db = getDb();
  const row = db.prepare("SELECT value FROM app_settings WHERE key = 'internal_api_secret'").get();
  return row?.value || process.env.INTERNAL_API_SECRET || 'dev-secret-change-in-production';
}

function signPayload(payload) {
  const secret = getSecret();
  const timestamp = Math.floor(Date.now() / 1000);
  const rawBody = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', secret).update(rawBody + String(timestamp)).digest('hex');
  return `${timestamp}.${sig}`;
}

async function checkEngine(engine) {
  const start = Date.now();
  try {
    const sig = signPayload({});
    const res = await fetch(`${engine.url}${engine.path}`, {
      headers: { 'X-Engine-Signature': sig },
      signal: AbortSignal.timeout(10000),
    });
    const body = await res.json();
    return {
      engine: engine.name,
      status: res.ok ? (body.status || 'ok') : 'http_error',
      checks: body.checks || {},
      response_time_ms: Date.now() - start,
      error: res.ok ? null : `HTTP ${res.status}`,
    };
  } catch (e) {
    return {
      engine: engine.name,
      status: 'down',
      checks: {},
      response_time_ms: Date.now() - start,
      error: e.message,
    };
  }
}

async function runWatcher() {
  const startAll = Date.now();
  const results = await Promise.all(ENGINES.map(checkEngine));
  const db = getDb();
  const insert = db.prepare(
    'INSERT INTO watcher_log (engine, status, checks, response_time_ms, error) VALUES (?, ?, ?, ?, ?)'
  );

  const alive = results.filter(r => r.status === 'ok').length;
  const degraded = results.filter(r => r.status === 'degraded').length;
  const down = results.filter(r => r.status === 'down').length;

  for (const r of results) {
    insert.run(r.engine, r.status, JSON.stringify(r.checks), r.response_time_ms, r.error);

    if (r.status !== 'ok') {
      db.prepare(
        "INSERT INTO agent_log (agent, action, details, website_id) VALUES (?, ?, ?, ?)"
      ).run(
        'EngineWatcher', 'alert',
        `[${r.engine}] unhealthy — ${r.error || r.status} (${r.response_time_ms}ms)`,
        1
      );
    }
  }

  const summary = `${alive} ok, ${degraded} degraded, ${down} down in ${Date.now() - startAll}ms`;
  console.log(`[EngineWatcher] ${summary}`);

  if (down > 0 || degraded > 0) {
    db.prepare(
      "INSERT INTO agent_log (agent, action, details, website_id) VALUES (?, ?, ?, ?)"
    ).run('EngineWatcher', 'summary', summary, 1);
  }

  return results;
}

function getLatestStatus() {
  const db = getDb();
  const engines = ENGINES.map(e => e.name);
  const latest = {};
  for (const name of engines) {
    const row = db.prepare(
      'SELECT * FROM watcher_log WHERE engine = ? ORDER BY created_at DESC LIMIT 1'
    ).get(name);
    if (row) latest[name] = row;
  }
  return latest;
}

function getHistory(limit = 50) {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM watcher_log ORDER BY created_at DESC LIMIT ?'
  ).all(limit);
}

function startWatcher(intervalMs = 2 * 60 * 60 * 1000) {
  console.log(`[EngineWatcher] Starting — checking every ${intervalMs / 60000}min`);
  // First check after 30s
  setTimeout(() => {
    runWatcher().catch(e => console.error('[EngineWatcher] Initial check failed:', e.message));
  }, 30000);
  // Recurring
  setInterval(() => {
    runWatcher().catch(e => console.error('[EngineWatcher] Check failed:', e.message));
  }, intervalMs);
}

module.exports = { runWatcher, getLatestStatus, getHistory, startWatcher };
