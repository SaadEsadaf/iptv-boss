const { getDb } = require('../db')
const crypto = require('crypto')

const SEO_TOPICS = [
  'Meilleur IPTV France 2026',
  'IPTV pas cher abonnement',
  'IPTV légal ou pas France',
  'Comment installer IPTV sur Firestick',
  'IPTV 4K chaînes françaises',
  'Comparatif IPTV vs Canal+',
  'IPTV pour match foot Ligue 1',
  'Guide IPTV TiviMate complet',
  'IPTV sur Smart TV Samsung',
  'IPTV pour expatriés français',
  'Application IPTV Smarters guide',
  'IPTV sans buffering solution',
  'Liste M3U IPTV gratuite',
  'IPTV VPN nécessaire ou pas',
  'IPTV bouquet sportif complet',
  'Best IPTV service USA 2026',
  'IPTV for Premier League',
  'IPTV Spanish channels',
  'IPTV Arabic channels Europe',
  'IPTV Deutschland 2026',
  'IPTV Nederlands beste aanbieder',
  'IPTV para ver fútbol español',
  'IPTV Morocco Maroc chaînes',
  'IPTV Algeria Algérie',
  'IPTV Africa bouquets',
]

async function generateArticle(topic) {
  const prompt = `Write a comprehensive, well-structured blog article in HTML format about: "${topic}"

Requirements:
- Title as H1
- At least 600 words
- Include H2, H3 subheadings
- Bullet points where appropriate
- Don't be salesy, be informative and helpful
- Natural language, real examples
- End with a CTA to try a free trial
- Output ONLY the HTML body content (no <html><body> tags, just the article content)
- Write in the natural language of the topic (French for French topics, English for English, etc.)
- Use authentic, native-level writing

Make it high quality, original, and genuinely useful to readers.`

  const res = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.1:8b-instruct-q8_0',
      prompt,
      stream: false,
      options: { temperature: 0.7, num_predict: 2048 }
    }),
    signal: AbortSignal.timeout(120000)
  })
  if (!res.ok) throw new Error(`Ollama: ${res.status}`)
  const data = await res.json()
  return data.response || ''
}

function slugify(text) {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function extractTitle(html) {
  const m = html.match(/<h1[^>]*>(.*?)<\/h1>/i)
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : 'Article IPTV'
}

function extractExcerpt(html) {
  const clean = html.replace(/<[^>]+>/g, '').trim()
  return clean.substring(0, 200).replace(/\s+\S*$/, '') + '...'
}

function detectLang(topic) {
  if (/[éèêëàâîïôûùçœæ]/i.test(topic)) return 'fr'
  if (/[äöüß]/i.test(topic)) return 'de'
  if (/[éíóúñ]/i.test(topic)) return 'es'
  if (/[àèéìòù]/i.test(topic) && /[^a-z]/i.test(topic)) return 'it'
  if (/[\u0600-\u06FF]/.test(topic)) return 'ar'
  if (/[ğüşıöç]/i.test(topic)) return 'tr'
  if (/[а-я]/i.test(topic)) return 'ru'
  return 'en'
}

async function generateBlogPost(topic) {
  const db = getDb()
  const slug = slugify(topic)
  const existing = db.prepare('SELECT id FROM blog_posts WHERE slug = ?').get(slug)
  if (existing) return { slug, existing: true }

  const html = await generateArticle(topic)
  if (!html || html.length < 200) throw new Error(`Article too short for: ${topic}`)

  const title = extractTitle(html)
  const excerpt = extractExcerpt(html)
  const lang = detectLang(topic)
  const keywords = topic.split(/[\s,]+/).filter(w => w.length > 2)

  db.prepare(`
    INSERT INTO blog_posts (slug, title, excerpt, content, language, keywords, topic, published, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
  `).run(slug, title, excerpt, html, lang, JSON.stringify(keywords), topic)

  return { slug, existing: false }
}

async function generateAllPosts() {
  const results = []
  for (const topic of SEO_TOPICS) {
    try {
      const r = await generateBlogPost(topic)
      results.push({ topic, ...r })
      console.log(`[Blog] ${r.existing ? 'EXISTS' : 'GENERATED'}: ${topic}`)
    } catch (e) {
      results.push({ topic, error: e.message })
      console.error(`[Blog] FAILED: ${topic}: ${e.message}`)
    }
    await new Promise(r => setTimeout(r, 5000))
  }
  return results
}

function getPublishedPosts(lang) {
  const db = getDb()
  let sql = 'SELECT id, slug, title, excerpt, language, keywords, topic, created_at FROM blog_posts WHERE published = 1'
  const params = []
  if (lang) { sql += ' AND language = ?'; params.push(lang) }
  sql += ' ORDER BY created_at DESC'
  return db.prepare(sql).all(...params)
}

function getPost(slug) {
  const db = getDb()
  return db.prepare('SELECT * FROM blog_posts WHERE slug = ? AND published = 1').get(slug)
}

function getLanguages() {
  const db = getDb()
  return db.prepare('SELECT DISTINCT language, COUNT(*) as count FROM blog_posts WHERE published = 1 GROUP BY language').all()
}

module.exports = { generateBlogPost, generateAllPosts, getPublishedPosts, getPost, getLanguages, SEO_TOPICS }
