const { getDb } = require('../db')
const { isRelevant, analyzeLead, buildSignalPayload, dedupAndSave } = require('./snifferUtils')
const sourceRanker = require('./sourceRanker')

function getUserAgent() { return 'Mozilla/5.0 (compatible; IPTVBossBot/1.0)' }

async function sniffReddit(forceAll = false) {
  const sources = sourceRanker.getSourcesToSniff('reddit')
  const allSignals = []

  for (const src of sources) {
    const trimmed = src.name.trim()
    if (!trimmed) continue
    try {
      const url = `https://www.reddit.com/r/${trimmed}/hot.json?limit=15`
      const res = await fetch(url, { headers: { 'User-Agent': getUserAgent() }, signal: AbortSignal.timeout(15000) })
      if (!res.ok) { console.log(`[RedditSniffer] r/${trimmed}: HTTP ${res.status}`); continue }
      const json = await res.json()
      const posts = json.data?.children || []

      let sourceSignalCount = 0
      const sourceIntentScores = []

      for (const post of posts.slice(0, 10)) {
        const data = post.data
        const text = (data.title || '') + ' ' + (data.selftext || '')
        if (!isRelevant(text)) continue

        let comments = []
        try {
          const cRes = await fetch(`https://www.reddit.com/r/${trimmed}/comments/${data.id}.json?limit=10`, {
            headers: { 'User-Agent': getUserAgent() }, signal: AbortSignal.timeout(10000),
          })
          if (cRes.ok) {
            const cJson = await cRes.json()
            comments = (cJson[1]?.data?.children || []).map(c => c.data?.body || '').filter(Boolean)
          }
        } catch (e) { /* comments optional */ }

        const combined = [text, ...comments].join('\n\n')
        const analysis = await analyzeLead(combined)
        allSignals.push(buildSignalPayload(
          'reddit', `r/${trimmed}`,
          `https://www.reddit.com${data.permalink || ''}`,
          combined, analysis
        ))
        sourceSignalCount++
        sourceIntentScores.push(analysis.intent_score || 0)
      }

      sourceRanker.recordResult('reddit', trimmed, sourceSignalCount, sourceIntentScores)
    } catch (e) {
      console.error(`[RedditSniffer] Error sniffing r/${trimmed}:`, e.message)
    }
  }

  return allSignals
}

async function sniffRedditAndSave(forceAll = false) {
  const signals = await sniffReddit(forceAll)

  sourceRanker.maybeDiscover('reddit')
  sourceRanker.maybePrune()

  if (signals.length === 0) return { saved: 0, message: 'No new signals found' }
  const saved = await dedupAndSave(signals)
  const db = getDb()
  db.prepare('INSERT INTO agent_log (agent, action, details) VALUES (?, ?, ?)').run(
    'RedditSniffer', 'sniff_completed', `Sniffed ${signals.length} relevant, saved ${saved} new`
  )
  return { saved, total: signals.length }
}

function startRedditSniffer() {
  const cron = require('node-cron')
  cron.schedule('0 */6 * * *', () => {
    const db = getDb()
    if ((db.prepare("SELECT value FROM app_settings WHERE key = 'reddit_sniffer_enabled'").get() || {}).value === '0') return
    console.log('[RedditSniffer] Running scheduled sniff...')
    sniffRedditAndSave().catch(e => console.error('[RedditSniffer] Cron error:', e))
  })
  console.log('[RedditSniffer] Cron scheduled (every 6 hours)')
}

module.exports = { sniffReddit, sniffRedditAndSave, startRedditSniffer }
