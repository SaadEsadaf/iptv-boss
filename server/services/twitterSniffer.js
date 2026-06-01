const { getDb } = require('../db')
const { isRelevant, analyzeLead, buildSignalPayload, dedupAndSave } = require('./snifferUtils')
const sourceRanker = require('./sourceRanker')

const NITTER_INSTANCES = ['https://nitter.net', 'https://nitter.lqdev.org', 'https://nitter.1d4.us']

async function tryNitterInstance(baseUrl, query) {
  const searchUrl = `${baseUrl}/search?q=${encodeURIComponent(query)}&f=tweets`
  const res = await fetch(searchUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; IPTVBossBot/1.0)' },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()

  const tweets = []
  const regex = /<div class="timeline-item"[^>]*>[\s\S]*?<div class="tweet-content[^"]*"[^>]*>([\s\S]*?)<\/div>/g
  let match
  while ((match = regex.exec(html)) !== null) {
    const text = match[1]
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim()
    if (text) tweets.push(text)
  }
  return tweets
}

async function sniffTwitter(forceAll = false) {
  const sources = sourceRanker.getSourcesToSniff('twitter')
  const allSignals = []

  for (const src of sources) {
    const trimmed = src.name.trim()
    if (!trimmed) continue

    let tweets = []
    for (const instance of NITTER_INSTANCES) {
      try { tweets = await tryNitterInstance(instance, trimmed); if (tweets.length) break }
      catch (e) { continue }
    }

    let sourceSignalCount = 0
    const sourceIntentScores = []

    for (const text of tweets.slice(0, 10)) {
      if (!isRelevant(text)) continue
      const analysis = await analyzeLead(text)
      allSignals.push(buildSignalPayload(
        'twitter', `X/${trimmed}`,
        `https://nitter.net/search?q=${encodeURIComponent(trimmed)}`,
        text, analysis
      ))
      sourceSignalCount++
      sourceIntentScores.push(analysis.intent_score || 0)
    }

    sourceRanker.recordResult('twitter', trimmed, sourceSignalCount, sourceIntentScores)
  }

  return allSignals
}

async function sniffTwitterAndSave(forceAll = false) {
  const signals = await sniffTwitter(forceAll)

  sourceRanker.maybeDiscover('twitter')
  sourceRanker.maybePrune()

  if (signals.length === 0) return { saved: 0, message: 'No new signals found' }
  const saved = await dedupAndSave(signals)
  const db = getDb()
  db.prepare('INSERT INTO agent_log (agent, action, details) VALUES (?, ?, ?)').run(
    'TwitterSniffer', 'sniff_completed', `Sniffed ${signals.length} relevant, saved ${saved} new`
  )
  return { saved, total: signals.length }
}

function startTwitterSniffer() {
  const cron = require('node-cron')
  cron.schedule('0 */6 * * *', () => {
    const db = getDb()
    if ((db.prepare("SELECT value FROM app_settings WHERE key = 'twitter_sniffer_enabled'").get() || {}).value === '0') return
    console.log('[TwitterSniffer] Running scheduled sniff...')
    sniffTwitterAndSave().catch(e => console.error('[TwitterSniffer] Cron error:', e))
  })
  console.log('[TwitterSniffer] Cron scheduled (every 6 hours)')
}

module.exports = { sniffTwitter, sniffTwitterAndSave, startTwitterSniffer }
