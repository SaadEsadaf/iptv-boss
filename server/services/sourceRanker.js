const { getDb } = require('../db')
const { generateText } = require('./aiProvider')

const MAX_EXPLOIT = 10
const MAX_EXPLORE = 5
const PRUNE_AFTER_EMPTY = 3
const PRUNE_LOW_RATE = 0.1
const PRUNE_AFTER_SNIFFS = 5
const DISCOVERY_INTERVAL_CYCLES = 4
const PRUNE_INTERVAL_CYCLES = 4

let cycleCounter = {}

function ensureTable() {
  const db = getDb()
  db.exec(`
    CREATE TABLE IF NOT EXISTS sniffer_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_type TEXT NOT NULL,
      name TEXT NOT NULL,
      lead_count INTEGER DEFAULT 0,
      sniff_count INTEGER DEFAULT 0,
      total_intent_score REAL DEFAULT 0,
      last_sniffed TEXT,
      enabled INTEGER DEFAULT 1,
      discovered_by TEXT DEFAULT 'seed',
      first_seen TEXT DEFAULT (datetime('now')),
      UNIQUE(source_type, name)
    )
  `)
}

function seedDefaults() {
  const db = getDb()
  ensureTable()
  const seeds = {
    telegram: ['iptvchat','iptvcommunity','iptv_providers','iptv_deutschland','iptv_espanol','iptvbrasil','iptv_india','arabic_iptv','iptv_france','iptv_italia','iptv_nederlands'],
    reddit: ['iptv','IPTVReview','cordcutters','IPTVdeutschland','IPTVespanol','IPTVBrasil','IPTVIndia','arabic_iptv','IPTVfrance','IPTVitalia','IPTVnederlands'],
    youtube: ['iptv review','best iptv 2026','iptv deutschland','iptv españa','iptv brasil','iptv india','iptv arabic','iptv france','iptv italia','iptv nederland'],
    twitter: ['iptv','iptv streaming','best iptv','iptv deutschland','iptv españa','iptv brasil','iptv india','iptv arabic','iptv france','iptv italia','iptv nederland'],
  }
  const insert = db.prepare('INSERT OR IGNORE INTO sniffer_sources (source_type, name, discovered_by) VALUES (?, ?, ?)')
  for (const [type, names] of Object.entries(seeds)) {
    for (const name of names) {
      insert.run(type, name, 'seed')
    }
  }
}

function getSourcesToSniff(type) {
  const db = getDb()
  ensureTable()
  const count = db.prepare('SELECT COUNT(*) as c FROM sniffer_sources WHERE source_type = ? AND enabled = 1').get(type)
  if (!count || count.c === 0) seedDefaults()

  if (!cycleCounter[type]) cycleCounter[type] = 0
  cycleCounter[type]++

  const top = db.prepare(`
    SELECT * FROM sniffer_sources
    WHERE source_type = ? AND enabled = 1
    ORDER BY
      CASE WHEN sniff_count = 0 THEN 0
        ELSE (CAST(lead_count AS REAL) / sniff_count) * 0.6 +
             CASE WHEN sniff_count = 0 THEN 0 ELSE (total_intent_score / sniff_count) * 0.4 END
      END DESC
    LIMIT ?
  `).all(type, MAX_EXPLOIT)

  const newCandidates = db.prepare(`
    SELECT * FROM sniffer_sources
    WHERE source_type = ? AND enabled = 1
    ORDER BY sniff_count ASC, last_sniffed IS NULL DESC, last_sniffed ASC
    LIMIT ?
  `).all(type, MAX_EXPLORE)

  const seen = new Set()
  const merged = []
  for (const s of [...top, ...newCandidates]) {
    if (!seen.has(s.name)) { seen.add(s.name); merged.push(s) }
  }
  return merged
}

function recordResult(type, name, leadCount, intentScores) {
  const db = getDb()
  const totalIntent = intentScores.reduce((a, b) => a + b, 0)
  db.prepare(`
    UPDATE sniffer_sources SET
      lead_count = lead_count + ?,
      sniff_count = sniff_count + 1,
      total_intent_score = total_intent_score + ?,
      last_sniffed = datetime('now')
    WHERE source_type = ? AND name = ?
  `).run(leadCount, totalIntent, type, name)
}

async function discoverNewSources(type) {
  const db = getDb()
  const existing = db.prepare('SELECT name FROM sniffer_sources WHERE source_type = ?').all(type).map(r => r.name)

  const typeLabel = { telegram: 'Telegram channels', reddit: 'subreddits', youtube: 'YouTube search queries', twitter: 'X/Twitter search keywords' }
  const regionHint = 'USA, Europe (DE, FR, IT, NL), Latin America (ES, PT), India (HI), Middle East (AR), Africa (FR, AR)'

  const prompt = `You are a lead discovery system for an IPTV business.
We sniff ${typeLabel[type] || type} to find leads interested in IPTV/streaming.
Currently monitored: ${existing.slice(0, 15).join(', ')}${existing.length > 15 ? '...' : ''}.
We need global coverage: ${regionHint}.

Suggest 5 new ${typeLabel[type] || type} targeting regions/languages with the least coverage.
Return ONLY a JSON array of strings. Example: ["value1","value2","value3","value4","value5"]`

  try {
    const aiResponse = await generateText({ system: prompt, messages: [{ role: 'user', content: 'Suggest new sources.' }], maxTokens: 500 })
    const start = aiResponse.indexOf('[')
    const end = aiResponse.lastIndexOf(']')
    if (start !== -1 && end !== -1) {
      const suggestions = JSON.parse(aiResponse.substring(start, end + 1))
      const insert = db.prepare('INSERT OR IGNORE INTO sniffer_sources (source_type, name, discovered_by) VALUES (?, ?, ?)')
      let added = 0
      for (const s of suggestions.slice(0, 5)) {
        const name = String(s).trim()
        if (name && name.length > 2) { insert.run(type, name, 'ai_suggestion'); added++ }
      }
      if (added > 0) {
        db.prepare('INSERT INTO agent_log (agent, action, details) VALUES (?, ?, ?)').run(
          'SourceRanker', 'ai_discovery', `AI discovered ${added} new ${type} sources`
        )
      }
      return added
    }
  } catch (e) {
    console.error(`[SourceRanker] AI discovery failed for ${type}:`, e.message)
  }

  const fallback = generateFallbackSources(type, existing)
  let added = 0
  const insert = db.prepare('INSERT OR IGNORE INTO sniffer_sources (source_type, name, discovered_by) VALUES (?, ?, ?)')
  for (const name of fallback) {
    insert.run(type, name, 'auto_discovery')
    added++
  }
  if (added > 0) {
    db.prepare('INSERT INTO agent_log (agent, action, details) VALUES (?, ?, ?)').run(
      'SourceRanker', 'auto_discovery', `Auto-discovered ${added} new ${type} sources`
    )
  }
  return added
}

function generateFallbackSources(type, existing) {
  const base = type === 'youtube' ? ['iptv review', 'iptv subscription', 'best iptv', 'iptv channels'] :
               ['iptv', 'iptv streaming', 'best iptv', 'iptv subscription']
  const suffixes = [' 2026', ' service', ' provider', ' deals', ' cheap', ' premium']
  const prefixes = ['deutschland ', 'españa ', 'brasil ', 'india ', 'arabic ', 'france ', 'italia ', 'nederland ', 'usa ', 'canada ', 'australia ', 'uk ']
  const results = []
  for (const prefix of prefixes) {
    for (const b of base) {
      const candidate = prefix + b
      if (!existing.some(e => e.toLowerCase().includes(candidate.toLowerCase()) || candidate.toLowerCase().includes(e.toLowerCase()))) {
        results.push(candidate)
        if (results.length >= 5) break
      }
    }
    if (results.length >= 5) break
  }
  return results.slice(0, 5)
}

function pruneLowPerformers() {
  const db = getDb()
  const pruned = db.prepare(`
    UPDATE sniffer_sources SET enabled = 0
    WHERE enabled = 1 AND discovered_by != 'seed'
      AND ((lead_count = 0 AND sniff_count >= ?) OR (sniff_count >= ? AND CAST(lead_count AS REAL) / sniff_count < ?))
  `).run(PRUNE_AFTER_EMPTY, PRUNE_AFTER_SNIFFS, PRUNE_LOW_RATE)
  if (pruned.changes > 0) {
    db.prepare('INSERT INTO agent_log (agent, action, details) VALUES (?, ?, ?)').run(
      'SourceRanker', 'pruned', `Disabled ${pruned.changes} low-performing sources`
    )
  }
  return pruned.changes
}

function maybeDiscover(type) {
  if (!cycleCounter[type] || cycleCounter[type] % DISCOVERY_INTERVAL_CYCLES !== 0) return false
  discoverNewSources(type)
  return true
}

function maybePrune() {
  for (const type of ['telegram', 'reddit', 'youtube', 'twitter']) {
    if (cycleCounter[type] && cycleCounter[type] % PRUNE_INTERVAL_CYCLES === 0) {
      pruneLowPerformers()
    }
  }
}

function getSourcePerformance(type) {
  const db = getDb()
  ensureTable()
  return db.prepare(`
    SELECT name, lead_count, sniff_count,
      CASE WHEN sniff_count > 0 THEN ROUND(CAST(lead_count AS REAL) / sniff_count, 2) ELSE 0 END as lead_rate,
      CASE WHEN sniff_count > 0 THEN ROUND(total_intent_score / sniff_count, 2) ELSE 0 END as avg_intent,
      last_sniffed, enabled, discovered_by, first_seen
    FROM sniffer_sources
    WHERE source_type = ?
    ORDER BY lead_rate DESC, lead_count DESC
  `).all(type)
}

function getAllSourcePerformance() {
  const types = ['telegram', 'reddit', 'youtube', 'twitter']
  const result = {}
  for (const type of types) result[type] = getSourcePerformance(type)
  return result
}

function addSource(type, name) {
  const db = getDb()
  db.prepare('INSERT OR IGNORE INTO sniffer_sources (source_type, name, discovered_by) VALUES (?, ?, ?)').run(type, name.trim(), 'manual')
  return true
}

function toggleSource(type, name, enabled) {
  const db = getDb()
  db.prepare('UPDATE sniffer_sources SET enabled = ? WHERE source_type = ? AND name = ?').run(enabled ? 1 : 0, type, name)
  return true
}

module.exports = {
  getSourcesToSniff, recordResult, discoverNewSources, pruneLowPerformers,
  maybeDiscover, maybePrune, getSourcePerformance, getAllSourcePerformance,
  addSource, toggleSource, seedDefaults, ensureTable,
}
