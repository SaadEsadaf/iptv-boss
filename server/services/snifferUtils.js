const { generateText } = require('./aiProvider')

const LEAD_KEYWORDS = [
  /* English — Europe, USA */
  'looking for', 'recommend', 'best provider', 'buffering',
  'need iptv', 'switching', 'trial', 'cheap iptv',
  'any good', 'suggest', 'which one', 'worth it',
  'iptv', 'streaming', 'subscription', 'provider',
  'reliable', 'stable iptv', 'hd channels', '4k iptv',
  /* French — Europe, Africa */
  'meilleur iptv', 'iptv pas cher', 'abonnement iptv',
  'fournisseur iptv', 'iptv français', 'iptv france',
  'arabe', 'arabic', 'francais', 'français',
  /* Spanish — Latin America, Europe */
  'mejor iptv', 'iptv barato', 'recomendar iptv',
  'cortes iptv', 'proveedor iptv', 'iptv en español',
  'suscripción iptv', 'iptv latino', 'canales iptv',
  'quiero iptv', 'precios iptv', 'servicio iptv',
  /* Portuguese — Latin America (Brazil), Europe */
  'melhor iptv', 'iptv barato', 'recomendar iptv',
  'assinatura iptv', 'provedor iptv', 'iptv brasil',
  'canais iptv', 'teste iptv', 'iptv gratis',
  /* Hindi — India */
  'iptv भारत', 'सस्ता iptv', 'iptv हिंदी',
  'iptv चैनल', 'भारतीय iptv', 'सबसे अच्छा iptv',
  'iptv subscription india',
  /* German — Europe */
  'iptv deutschland', 'bester iptv', 'iptv empfehlung',
  'günstiger iptv', 'iptv anbieter', 'deutsche sender iptv',
  /* Italian — Europe */
  'miglior iptv', 'iptv economico', 'iptv italiano',
  'canali iptv', 'abbonamento iptv',
  /* Dutch — Europe */
  'beste iptv', 'goedkope iptv', 'iptv nederlands',
  'iptv nederland', 'iptv abonnement',
  /* Arabic — Middle East, Africa */
  'ارخص', 'افضل', 'مشترك', 'تقطيع', 'بث',
  'iptv', 'اشتراك iptv', 'سيرفر iptv', 'iptv عربي',
  'قنوات iptv', 'iptv السعودية',
]

function extractEmails(text) {
  const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)
  return matches ? [...new Set(matches)].join(', ') : ''
}

function extractPhones(text) {
  const matches = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g)
  const valid = (matches || []).filter(m => m.replace(/[\s.-]/g, '').length >= 7 && m.replace(/[\s.-]/g, '').length <= 15)
  return valid.length ? [...new Set(valid)].join(', ') : ''
}

function extractGroups(text) {
  const matches = text.match(/(?:t(?:elegram)?\.(?:me|org)\/(?:joinchat\/)?[a-zA-Z0-9_]+)/gi)
  return matches ? [...new Set(matches)].join(', ') : ''
}

function detectLanguage(text) {
  const lower = text.toLowerCase()
  if (/[\u0600-\u06FF]/.test(text)) return 'ar'
  if (/[\u0900-\u097F]/.test(text)) return 'hi'
  if (/ó|é|í|ú|ñ|quiero|mejor|puede|para|con |los |las |más /.test(lower)) return 'es'
  if (/ão|ç|ê|melhor|para|com |uma |mais /.test(lower)) return 'pt'
  if (/fr[éeèêë]|fran[cç]ais|je |nous |vous |pour |dans |avec /.test(lower)) return 'fr'
  if (/der |die |das |und |oder |für |ein |eine |bester|deutsch/.test(lower)) return 'de'
  if (/miglior|abbonamento|canali|economico|italia/.test(lower)) return 'it'
  if (/beste|goedkope|nederlands|abonnement|beste /.test(lower)) return 'nl'
  return 'en'
}

function isRelevant(text) {
  const lower = text.toLowerCase()
  return LEAD_KEYWORDS.some(k => lower.includes(k))
}

async function analyzeLead(text, task = 'seo') {
  let analysis = { pain_point: '', opportunity: '', intent_score: 50, lead_contact: '' }
  try {
    const response = await generateText({
      system: 'You are a lead qualification AI for an IPTV streaming service. Return ONLY valid JSON.',
      messages: [{
        role: 'user',
        content: `Analyze this message:\n"${text.slice(0, 1000)}"\n
Return JSON (no markdown, no backticks):
{
  "pain_point": "what problem are they experiencing",
  "opportunity": "how an IPTV reseller can help",
  "intent_score": number 0-100,
  "lead_contact": "any @username or contact info, or empty string"
}`
      }],
      maxTokens: 500,
      task,
    })
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) analysis = JSON.parse(jsonMatch[0])
  } catch (e) {
    if (e.message !== 'AI_NOT_CONFIGURED') console.error(`[SnifferUtils] AI error:`, e.message)
  }
  return analysis
}

function buildSignalPayload(source, sourceName, sourceUrl, content, analysis, extras = {}) {
  const regexEmail = extractEmails(content)
  const regexPhone = extractPhones(content)
  const regexGroups = extractGroups(content)
  const detectedLang = detectLanguage(content)

  return {
    source,
    source_name: sourceName,
    source_url: sourceUrl,
    content: content.slice(0, 1000),
    pain_point: analysis.pain_point || '',
    opportunity: analysis.opportunity || '',
    intent_score: analysis.intent_score || 50,
    lead_contact: analysis.lead_contact || extras.lead_contact || '',
    email: extras.email || regexEmail || '',
    phone: extras.phone || regexPhone || '',
    groups_mentioned: extras.groups_mentioned || regexGroups || '',
    language: extras.language || detectedLang || '',
  }
}

async function dedupAndSave(signals) {
  const { getDb } = require('../db')
  const db = getDb()

  const insert = db.prepare(`INSERT INTO demand_signals
    (source, source_name, source_url, content, pain_point, opportunity, intent_score, lead_contact, email, phone, groups_mentioned, language)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)

  let saved = 0
  for (const s of signals) {
    const existing = db.prepare(
      'SELECT id FROM demand_signals WHERE source_url = ? AND content = ?'
    ).get(s.source_url, s.content.slice(0, 200))
    if (existing) continue
    insert.run(s.source, s.source_name, s.source_url, s.content,
      s.pain_point, s.opportunity, s.intent_score, s.lead_contact,
      s.email, s.phone, s.groups_mentioned, s.language)
    saved++
  }
  return saved
}

module.exports = {
  LEAD_KEYWORDS,
  extractEmails,
  extractPhones,
  extractGroups,
  detectLanguage,
  isRelevant,
  analyzeLead,
  buildSignalPayload,
  dedupAndSave,
}
