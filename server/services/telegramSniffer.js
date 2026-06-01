const { getDb } = require('../db')
const { extractEmails, extractPhones, extractGroups, detectLanguage, isRelevant, analyzeLead, buildSignalPayload, dedupAndSave } = require('./snifferUtils')
const sourceRanker = require('./sourceRanker')

const CHANNEL_BASE = 'https://t.me/s/'

function parseTelegramMessages(html) {
  const messages = []
  const regex = /data-post="([^"]+)"[\s\S]*?class="tgme_widget_message_text[^"]*"[\s\S]*?>([\s\S]*?)<\/div>/g
  let match
  while ((match = regex.exec(html)) !== null) {
    const postRef = match[1]
    const textHtml = match[2]
    const parts = postRef.split('/')
    const text = textHtml
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim()
    if (text) messages.push({ id: parts[parts.length - 1], text })
  }
  return messages.reverse().slice(-30)
}

function extractGroupLinks(text) {
  const links = []
  const pattern = /t\.me\/([a-zA-Z0-9_]+)/g
  let m
  while ((m = pattern.exec(text)) !== null) {
    if (m[1] && m[1].length > 2 && !m[1].startsWith('s/')) links.push(m[1])
  }
  return links
}

async function sniffTelegram(forceAll = false) {
  const sources = sourceRanker.getSourcesToSniff('telegram')
  const allSignals = []
  const sourceLeads = {}

  for (const src of sources) {
    const trimmed = src.name.trim()
    if (!trimmed) continue
    try {
      const res = await fetch(`${CHANNEL_BASE}${trimmed}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; IPTVBossBot/1.0)' },
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) { console.log(`[TelegramSniffer] ${trimmed}: HTTP ${res.status}`); continue }
      const html = await res.text()
      const messages = parseTelegramMessages(html)
      const relevant = messages.filter(m => isRelevant(m.text))

      for (const msg of relevant.slice(0, 10)) {
        const analysis = await analyzeLead(msg.text)
        allSignals.push(buildSignalPayload(
          'telegram', trimmed, `https://t.me/${trimmed}/${msg.id}`, msg.text, analysis
        ))
      }

      const leads = relevant.slice(0, 10).length
      sourceLeads[trimmed] = leads

      const groupLinks = extractGroupLinks(messages.map(m => m.text).join('\n'))
      for (const link of groupLinks) {
        sourceRanker.addSource('telegram', link)
      }
    } catch (e) {
      console.error(`[TelegramSniffer] Error sniffing ${trimmed}:`, e.message)
    }
  }

  for (const [name, leads] of Object.entries(sourceLeads)) {
    sourceRanker.recordResult('telegram', name, leads, allSignals.filter(s => s.source_name === name).map(s => s.intent_score || 0))
  }

  return allSignals
}

async function sniffTelegramAndSave(forceAll = false) {
  const signals = await sniffTelegram(forceAll)

  sourceRanker.maybeDiscover('telegram')
  sourceRanker.maybePrune()

  if (signals.length === 0) return { saved: 0, message: 'No new signals found' }
  const saved = await dedupAndSave(signals)
  const db = getDb()
  db.prepare('INSERT INTO agent_log (agent, action, details) VALUES (?, ?, ?)').run(
    'TelegramSniffer', 'sniff_completed', `Sniffed ${signals.length} relevant, saved ${saved} new`
  )
  return { saved, total: signals.length }
}

async function enrichSignal(signalId) {
  const db = getDb()
  const signal = db.prepare('SELECT * FROM demand_signals WHERE id = ?').get(signalId)
  if (!signal) throw new Error('Signal not found')
  const analysis = await analyzeLead(signal.content)
  const enriched = buildSignalPayload(
    signal.source, signal.source_name, signal.source_url, signal.content, analysis
  )
  db.prepare(`UPDATE demand_signals SET
    pain_point=?, opportunity=?, intent_score=?, lead_contact=?,
    email=?, phone=?, groups_mentioned=?, language=?
    WHERE id=?`).run(
    enriched.pain_point, enriched.opportunity, enriched.intent_score, enriched.lead_contact,
    enriched.email, enriched.phone, enriched.groups_mentioned, enriched.language,
    signalId
  )
  return { success: true }
}

function startTelegramSniffer() {
  const cron = require('node-cron')
  cron.schedule('0 */6 * * *', () => {
    const db = getDb()
    if ((db.prepare("SELECT value FROM app_settings WHERE key = 'telegram_sniffer_enabled'").get() || {}).value === '0') return
    console.log('[TelegramSniffer] Running scheduled sniff...')
    sniffTelegramAndSave().catch(e => console.error('[TelegramSniffer] Cron error:', e))
  })
  console.log('[TelegramSniffer] Cron scheduled (every 6 hours)')
}

module.exports = { sniffTelegram, sniffTelegramAndSave, startTelegramSniffer, enrichSignal }
