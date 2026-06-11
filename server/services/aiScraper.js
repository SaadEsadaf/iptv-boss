const { getDb } = require('../db')

const TARGET_SITES = [
  'https://www.reddit.com/r/IPTVGroupBuy/search.json?q=looking+for+iptv&restrict_sr=1&limit=25&sort=new',
  'https://www.reddit.com/r/IPTVReviews/search.json?q=recommendation&restrict_sr=1&limit=25&sort=new',
  'https://www.reddit.com/r/iptv/search.json?q=%22email%22&restrict_sr=1&limit=25&sort=new',
  'https://www.reddit.com/r/IPTVsubs/search.json?q=contact&restrict_sr=1&limit=25&sort=new',
  'https://www.reddit.com/r/cordcutters/search.json?q=iptv+recommend&restrict_sr=1&limit=25&sort=new',
  'https://www.reddit.com/r/streaming/search.json?q=iptv&restrict_sr=1&limit=25&sort=new',
  'https://www.reddit.com/r/IPTVresellers/search.json?q=need&restrict_sr=1&limit=25&sort=top',
  'https://www.reddit.com/r/TiviMate/search.json?q=help&restrict_sr=1&limit=25&sort=new',
]

// Hardcoded forum URLs where people leave IPTV requests
const FORUM_URLS = [
  'https://iptv.community/c/iptv-chat/5',
  'https://iptv.community/c/iptv-requests/6',
  'https://forum.iptv.community/c/iptv-chat',
  'https://trustpilot.com/review/www.atlaspro.tv',
  'https://trustpilot.com/review/www.strong-sellup.io',
]

function detectLanguage(text) {
  if (/[éèêëàâîïôûùçœæ]/i.test(text)) return 'fr'
  if (/[\u0600-\u06FF]/.test(text)) return 'ar'
  if (/[éíóúñ¿¡]/i.test(text)) return 'es'
  if (/[äöüß]/i.test(text)) return 'de'
  if (/[àèéìòù]/i.test(text)) return 'it'
  return 'en'
}

function extractEmailSimple(text) {
  const m = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/)
  return m ? m[1].toLowerCase() : ''
}

async function ollamaExtractContacts(rawText) {
  const prompt = `Extract ALL email addresses and phone numbers from this text. Return ONLY a JSON array of objects with fields: "email", "phone", "name" (if found), "context" (brief 1-line description of what the person wants).

Text:
${rawText.substring(0, 8000)}

Return ONLY valid JSON array, nothing else. If nothing found, return [].`

  const res = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.1:8b-instruct-q8_0',
      prompt,
      stream: false,
      options: { temperature: 0.1, num_predict: 1024 }
    }),
    signal: AbortSignal.timeout(30000)
  })
  if (!res.ok) return []
  const data = await res.json()
  const text = data.response || ''
  try {
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function scrapeReddit(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(15000)
    })
    if (!res.ok) return []
    const data = await res.json()
    const posts = []
    for (const child of data?.data?.children || []) {
      const p = child?.data
      if (!p || p.over_18) continue
      const text = `${p.title || ''} ${p.selftext || ''}`
      if (text.length < 30) continue
      posts.push({
        text: text.substring(0, 2000),
        author: p.author,
        subreddit: p.subreddit,
        permalink: p.permalink,
        score: p.score,
        created: p.created_utc,
        email: extractEmailSimple(text)
      })
    }
    return posts
  } catch { return [] }
}

async function scrapeUrl(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(15000)
    })
    if (!res.ok) return []
    const html = await res.text()
    const text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[^;]+;/g, ' ')
      .replace(/\s+/g, ' ').trim()
    if (text.length < 100) return []
    return [{ text: text.substring(0, 8000), url }]
  } catch { return [] }
}

async function aiExtract(posts) {
  const results = []
  for (const post of posts) {
    const simpleEmail = extractEmailSimple(post.text)
    if (simpleEmail) {
      results.push({
        email: simpleEmail,
        phone: '',
        name: post.author || '',
        context: post.text.substring(0, 200),
        source: post.subreddit || 'web',
        source_url: post.permalink ? `https://reddit.com${post.permalink}` : post.url || '',
        intent_score: 85,
        language: detectLanguage(post.text),
      })
      continue
    }
    const contacts = await ollamaExtractContacts(post.text)
    for (const c of contacts) {
      if (c.email || c.phone) {
        results.push({
          email: (c.email || '').toLowerCase(),
          phone: c.phone || '',
          name: c.name || post.author || '',
          context: c.context || post.text.substring(0, 200),
          source: post.subreddit || 'web',
          source_url: post.permalink ? `https://reddit.com${post.permalink}` : post.url || '',
          intent_score: 80,
          language: detectLanguage(post.text),
        })
      }
    }
  }
  return results
}

async function run() {
  const db = getDb()
  let total = 0
  const seenEmails = new Set()

  // Scrape Reddit
  for (const url of TARGET_SITES) {
    const posts = await scrapeReddit(url)
    const leads = await aiExtract(posts)
    for (const l of leads) {
      if (l.email && seenEmails.has(l.email)) continue
      if (l.email) seenEmails.add(l.email)
      try {
        db.prepare(`
          INSERT OR IGNORE INTO demand_signals (source, source_name, content, email, phone, author, language, intent_score, source_url, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(l.source, 'ai_scraper', l.context, l.email, l.phone, l.name, l.language, l.intent_score, l.source_url)
        total++
      } catch {}
    }
    await new Promise(r => setTimeout(r, 2000))
  }

  // Scrape forum URLs
  for (const url of FORUM_URLS) {
    const pages = await scrapeUrl(url)
    const leads = await aiExtract(pages)
    for (const l of leads) {
      if (l.email && seenEmails.has(l.email)) continue
      if (l.email) seenEmails.add(l.email)
      try {
        db.prepare(`
          INSERT OR IGNORE INTO demand_signals (source, source_name, content, email, phone, author, language, intent_score, source_url, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run('web', 'ai_scraper', l.context, l.email, l.phone, l.name, l.language, l.intent_score, l.source_url)
        total++
      } catch {}
    }
    await new Promise(r => setTimeout(r, 3000))
  }

  return total
}

module.exports = { run, aiExtract, scrapeReddit, scrapeUrl, ollamaExtractContacts }
