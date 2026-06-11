const { getDb } = require('../db')

const TARGETS = [
  // Reddit - IPTV request posts
  { url: 'https://www.reddit.com/r/IPTVGroupBuy/search.json?q=looking+for+iptv&restrict_sr=1&limit=50&sort=new', type: 'reddit' },
  { url: 'https://www.reddit.com/r/IPTVReviews/search.json?q=recommend&restrict_sr=1&limit=50&sort=new', type: 'reddit' },
  { url: 'https://www.reddit.com/r/iptv/search.json?q=recommendation&restrict_sr=1&limit=50&sort=new', type: 'reddit' },
  { url: 'https://www.reddit.com/r/IPTVsubs/search.json?q=subscription&restrict_sr=1&limit=50&sort=new', type: 'reddit' },
  { url: 'https://www.reddit.com/r/cordcutters/search.json?q=iptv&restrict_sr=1&limit=50&sort=new', type: 'reddit' },
  { url: 'https://www.reddit.com/r/TiviMate/search.json?q=help&restrict_sr=1&limit=50&sort=new', type: 'reddit' },
  { url: 'https://www.reddit.com/r/IPTVresellers/search.json?q=need&restrict_sr=1&limit=50&sort=new', type: 'reddit' },
  { url: 'https://www.reddit.com/r/streaming/search.json?q=iptv&restrict_sr=1&limit=50&sort=new', type: 'reddit' },
  // Nitter (Twitter)
  { url: 'https://nitter.net/search?q=iptv+subscription&f=top', type: 'nitter' },
  { url: 'https://nitter.net/search?q=iptv+best+provider&f=top', type: 'nitter' },
  { url: 'https://nitter.net/search?q=iptv+recommendation&f=top', type: 'nitter' },
  // Trustpilot reviews
  { url: 'https://www.trustpilot.com/review/www.atlaspro.tv', type: 'trustpilot' },
  { url: 'https://www.trustpilot.com/review/strong-sellup.io', type: 'trustpilot' },
]

function extractEmail(text) {
  const m = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/)
  return m ? m[1].toLowerCase() : ''
}

function extractPhone(text) {
  const m = text.match(/(?:\+?\d{1,3})?[-.\s]?\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{3,9}/)
  return m ? m[0].trim() : ''
}

function detectLanguage(text) {
  if (/[éèêëàâîïôûùçœæ]/i.test(text)) return 'fr'
  if (/[\u0600-\u06FF]/.test(text)) return 'ar'
  if (/[éíóúñ¿¡]/i.test(text)) return 'es'
  if (/[äöüß]/i.test(text)) return 'de'
  if (/[àèéìòù]/i.test(text)) return 'it'
  if (/[ğüşıöç]/i.test(text)) return 'tr'
  return 'en'
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    signal: AbortSignal.timeout(15000)
  })
  if (!res.ok) return null
  return res.json()
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    signal: AbortSignal.timeout(15000)
  })
  if (!res.ok) return ''
  return res.text()
}

async function harvest() {
  const db = getDb()
  let total = 0
  const seen = new Set()

  for (const target of TARGETS) {
    try {
      if (target.type === 'reddit') {
        const data = await fetchJson(target.url)
        if (!data?.data?.children) continue
        for (const child of data.data.children) {
          const p = child?.data
          if (!p || p.over_18) continue
          const text = `${p.title || ''} ${p.selftext || ''}`
          if (text.length < 30) continue
          const email = extractEmail(text)
          const phone = extractPhone(text)
          if (!email && !phone) continue
          const key = email || phone
          if (seen.has(key)) continue
          seen.add(key)
          try {
            db.prepare(`INSERT OR IGNORE INTO demand_signals 
              (source, source_name, content, email, phone, author, language, intent_score, source_url, created_at) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`)
              .run('reddit', `r/${p.subreddit}`, text.substring(0, 1000), email, phone, p.author || '', detectLanguage(text), email ? 85 : 60, `https://reddit.com${p.permalink}`)
            total++
          } catch {}
        }
      } else if (target.type === 'nitter') {
        const html = await fetchHtml(target.url)
        if (!html) continue
        const texts = html.match(/class="tweet-content"[^>]*>([\s\S]{30,500})<\/div>/gi) || []
        for (const t of texts) {
          const clean = t.replace(/<[^>]+>/g, '').replace(/&#\d+;/g, '').replace(/&amp;/g, '&').trim()
          if (clean.length < 30) continue
          const email = extractEmail(clean)
          const phone = extractPhone(clean)
          if (!email && !phone) continue
          const key = email || phone
          if (seen.has(key)) continue
          seen.add(key)
          try {
            db.prepare(`INSERT OR IGNORE INTO demand_signals 
              (source, source_name, content, email, phone, author, language, intent_score, source_url, created_at) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`)
              .run('twitter', 'nitter', clean.substring(0, 1000), email, phone, '', detectLanguage(clean), email ? 85 : 60, target.url)
            total++
          } catch {}
        }
      } else if (target.type === 'trustpilot') {
        const html = await fetchHtml(target.url)
        if (!html) continue
        const reviews = html.match(/class="review-content"[^>]*>([\s\S]{30,800})<\/div>/gi) || []
        for (const r of reviews) {
          const clean = r.replace(/<[^>]+>/g, '').replace(/&#\d+;/g, '').replace(/&amp;/g, '&').trim()
          if (clean.length < 30) continue
          const email = extractEmail(clean)
          const phone = extractPhone(clean)
          if (!email && !phone) continue
          const key = email || phone
          if (seen.has(key)) continue
          seen.add(key)
          try {
            db.prepare(`INSERT OR IGNORE INTO demand_signals 
              (source, source_name, content, email, phone, author, language, intent_score, source_url, created_at) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`)
              .run('web', 'trustpilot', clean.substring(0, 1000), email, phone, '', detectLanguage(clean), email ? 85 : 60, target.url)
            total++
          } catch {}
        }
      }
    } catch {}
    await new Promise(r => setTimeout(r, 1500))
  }
  return total
}

module.exports = { harvest }
