const { getDb } = require('../db');

function storeInsight({ type, context, action, outcome, score = 0, tags = [] }) {
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO brain_memory (memory_type, context, action_taken, outcome, score, tags) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(type, context || null, action || null, outcome || null, score, JSON.stringify(tags));
  return result.lastInsertRowid;
}

function recallSimilar(contextStr, limit = 5) {
  const db = getDb();
  const memories = db.prepare(
    "SELECT * FROM brain_memory WHERE score > 0 ORDER BY score DESC, created_at DESC LIMIT ?"
  ).all(limit);
  return memories.map(m => ({
    ...m,
    tags: safeJson(m.tags, []),
  }));
}

function getActiveRules() {
  const db = getDb();
  const rules = db.prepare(
    "SELECT * FROM brain_memory WHERE memory_type = 'rule' AND score >= 2 ORDER BY score DESC LIMIT 20"
  ).all();
  return rules.map(r => ({
    ...r,
    tags: safeJson(r.tags, []),
  }));
}

function scoreDecision(decisionId, outcomeScore, outcomeNote) {
  const db = getDb();
  db.prepare(
    "UPDATE brain_decisions SET outcome_score = ?, outcome_note = ?, evaluated_at = datetime('now') WHERE id = ?"
  ).run(outcomeScore, outcomeNote || null, decisionId);
}

function getPendingEvaluations() {
  const db = getDb();
  return db.prepare(
    "SELECT * FROM brain_decisions WHERE outcome_score IS NULL AND executed = 1 AND executed_at IS NOT NULL AND datetime('now') > datetime(executed_at, '+12 hours')"
  ).all();
}

function storeDecision({ decisionType, params, reasoning, confidence, metricsSnapshot }) {
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO brain_decisions (decision_type, params, reasoning, confidence, metrics_snapshot) VALUES (?, ?, ?, ?, ?)'
  ).run(decisionType, params ? JSON.stringify(params) : null, reasoning || null, confidence || null, metricsSnapshot || null);
  return result.lastInsertRowid;
}

function markExecuted(decisionId) {
  const db = getDb();
  db.prepare("UPDATE brain_decisions SET executed = 1, executed_at = datetime('now') WHERE id = ?").run(decisionId);
}

function getRecentDecisions(limit = 20) {
  const db = getDb();
  return db.prepare('SELECT * FROM brain_decisions ORDER BY created_at DESC LIMIT ?').all(limit);
}

function getRecentMemories(limit = 30) {
  const db = getDb();
  return db.prepare('SELECT * FROM brain_memory ORDER BY created_at DESC LIMIT ?').all(limit);
}

function pruneMemories() {
  const db = getDb();
  db.prepare("DELETE FROM brain_memory WHERE score <= -5 OR (created_at < datetime('now', '-30 days') AND score < 2)").run();
}

function safeJson(val, def) {
  try { return JSON.parse(val); } catch { return def; }
}

module.exports = {
  storeInsight, recallSimilar, getActiveRules,
  scoreDecision, getPendingEvaluations,
  storeDecision, markExecuted,
  getRecentDecisions, getRecentMemories,
  pruneMemories,
};
