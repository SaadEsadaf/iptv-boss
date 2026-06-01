const { getDb } = require('../db')
const { isRelevant, analyzeLead, buildSignalPayload, dedupAndSave } = require('./snifferUtils')
const sourceRanker = require('./sourceRanker')

async function sniffYouTube(forceAll = false) {
  const db = getDb()
  const apiKey = (db.prepare("SELECT value FROM app_settings WHERE key = 'youtube_api_key'").get() || {}).value || process.env.YOUTUBE_API_KEY || ''
  if (!apiKey) {
    console.log('[YouTubeSniffer] No API key configured')
    return []
  }

  const sources = sourceRanker.getSourcesToSniff('youtube')
  const allSignals = []

  for (const src of sources) {
    const trimmed = src.name.trim()
    if (!trimmed) continue
    try {
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(trimmed)}&maxResults=5&type=video&key=${apiKey}`
      const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(10000) })
      if (!searchRes.ok) { console.log(`[YouTubeSniffer] Search "${trimmed}": HTTP ${searchRes.status}`); continue }
      const searchJson = await searchRes.json()
      const videos = searchJson.items || []

      let sourceSignalCount = 0
      const sourceIntentScores = []

      for (const video of videos) {
        const videoId = video.id?.videoId
        if (!videoId) continue

        try {
          const commentsUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=20&key=${apiKey}`
          const cRes = await fetch(commentsUrl, { signal: AbortSignal.timeout(10000) })
          if (!cRes.ok) continue
          const cJson = await cRes.json()
          const comments = cJson.items || []

          for (const item of comments) {
            const snippet = item.snippet?.topLevelComment?.snippet || item.snippet
            const text = snippet?.textDisplay || ''
            if (!text || !isRelevant(text)) continue

            const author = snippet?.authorDisplayName || ''
            const analysis = await analyzeLead(text)
            allSignals.push(buildSignalPayload(
              'youtube', video.snippet?.channelTitle || trimmed,
              `https://youtube.com/watch?v=${videoId}`,
              text, analysis,
              { lead_contact: author ? `@${author}` : '' }
            ))
            sourceSignalCount++
            sourceIntentScores.push(analysis.intent_score || 0)
          }
        } catch (e) {
          if (e.message !== 'AI_NOT_CONFIGURED') console.error('[YouTubeSniffer] Comments error:', e.message)
        }
      }

      sourceRanker.recordResult('youtube', trimmed, sourceSignalCount, sourceIntentScores)
    } catch (e) {
      console.error(`[YouTubeSniffer] Error searching "${trimmed}":`, e.message)
    }
  }

  return allSignals
}

async function sniffYouTubeAndSave(forceAll = false) {
  const signals = await sniffYouTube(forceAll)

  sourceRanker.maybeDiscover('youtube')
  sourceRanker.maybePrune()

  if (signals.length === 0) return { saved: 0, message: 'No new signals found' }
  const saved = await dedupAndSave(signals)
  const db = getDb()
  db.prepare('INSERT INTO agent_log (agent, action, details) VALUES (?, ?, ?)').run(
    'YouTubeSniffer', 'sniff_completed', `Sniffed ${signals.length} relevant, saved ${saved} new`
  )
  return { saved, total: signals.length }
}

function startYouTubeSniffer() {
  const cron = require('node-cron')
  cron.schedule('0 */12 * * *', () => {
    const db = getDb()
    if ((db.prepare("SELECT value FROM app_settings WHERE key = 'youtube_sniffer_enabled'").get() || {}).value === '0') return
    console.log('[YouTubeSniffer] Running scheduled sniff...')
    sniffYouTubeAndSave().catch(e => console.error('[YouTubeSniffer] Cron error:', e))
  })
  console.log('[YouTubeSniffer] Cron scheduled (every 12 hours)')
}

module.exports = { sniffYouTube, sniffYouTubeAndSave, startYouTubeSniffer }
