const express = require('express');
const router = express.Router();
const https = require('https');
const { getDb } = require('../db');
const { getAlexReply, parseActions } = require('../services/salesAgent');
const { assignCode, assignTrial } = require('../services/codeAssigner');
const { sendCredentials, sendTrial, sendPaymentLink } = require('../services/emailService');
const { createPaymentLink } = require('../services/sellupService');
const { lookupByEmail } = require('../services/customerQuery');
const { generateTextWithImages } = require('../services/aiProvider');
const { detect } = require('../services/languageDetector');
const crypto = require('crypto');

const MAX_IMAGE_SIZE = 2 * 1024 * 1024 // 2MB

const COUNTRY_LANG_MAP = {
  MA: 'fr', DZ: 'fr', TN: 'fr', FR: 'fr', BE: 'fr', CH: 'fr',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es',
  PT: 'pt', BR: 'pt',
  DE: 'de', AT: 'de',
  NL: 'nl',
  IT: 'it',
  SA: 'ar', AE: 'ar', EG: 'ar', QA: 'ar', KW: 'ar', JO: 'ar', LB: 'ar',
  TR: 'tr',
  PL: 'pl',
  RU: 'ru',
  JP: 'ja',
  KR: 'ko',
  CN: 'zh',
  IN: 'hi',
}

const geoCache = new Map()

function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for']
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) return null
  return ip
}

function geoLookup(ip) {
  return new Promise((resolve) => {
    if (!ip) return resolve(null)
    if (geoCache.has(ip)) return resolve(geoCache.get(ip))
    const req = https.get(`https://ip-api.com/json/${ip}?fields=countryCode`, (res) => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => {
        try {
          const { countryCode } = JSON.parse(d)
          const lang = COUNTRY_LANG_MAP[countryCode] || null
          if (lang) geoCache.set(ip, lang)
          resolve(lang)
        } catch { resolve(null) }
      })
    })
    req.on('error', () => resolve(null))
    req.setTimeout(3000, () => { req.destroy(); resolve(null) })
  })
}

async function analyzeImage(imageData, question) {
  try {
    const analysis = await generateTextWithImages({
      system: 'You are analyzing a screenshot for an IPTV support agent. Describe exactly what you see: error messages, app name, screen type, any visible settings or credentials. Be specific and concise.',
      messages: [{ role: 'user', content: question || 'What do you see in this screenshot?' }],
      images: [imageData],
      maxTokens: 300,
      task: 'chat',
    })
    return analysis.trim()
  } catch (e) {
    console.warn('[Chat] Image analysis failed:', e.message)
    return null
  }
}

function hasTrialIntent(msg, langInfo) {
  const lower = msg.toLowerCase()
  const en = ['trial', 'try', 'test', 'free']
  const fr = ['essai', 'essayer', 'gratuit', 'test']
  const es = ['prueba', 'probar', 'gratis', 'test']
  const de = ['testen', 'probe', 'kostenlos', 'test']
  const nl = ['proef', 'test', 'gratis']
  const pt = ['teste', 'experimentar', 'grátis', 'gratuito']
  const ar = ['تجربة', 'مجاني', 'اختبار']
  const it = ['prova', 'gratuito', 'test']
  const tr = ['deneme', 'ücretsiz', 'test']
  const pl = ['próba', 'darmowy', 'test']
  const ru = ['пробный', 'бесплатно', 'тест']
  const all = [...en, ...fr, ...es, ...de, ...nl, ...pt, ...ar, ...it, ...tr, ...pl, ...ru]
  return all.some(k => lower.includes(k))
}

function checkAbuse(customerData) {
  if (!customerData) return null
  if (customerData.abuseFlagged) return 'flagged'
  if (customerData.activeTrial && !customerData.isExisting) return 'active_trial'
  if (customerData.trialCount >= 2 && !customerData.isExisting) return 'max_trials'
  return null
}

async function generateIssueSummary(message, imageAnalysis, language) {
  // Simple rule-based summary from keywords
  const lower = message.toLowerCase()
  if (lower.includes('buffering') || lower.includes('freezing') || lower.includes('lag')) return 'Buffering/streaming issues'
  if (lower.includes('setup') || lower.includes('how to') || lower.includes('install')) return 'Setup/installation help'
  if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('invalid')) return 'Authentication error'
  if (lower.includes('trial') || lower.includes('free')) return 'Trial request'
  if (lower.includes('subscribe') || lower.includes('buy') || lower.includes('price')) return 'Purchase interest'
  if (lower.includes('not working') || lower.includes('no stream') || lower.includes('error')) return 'Technical issue'
  if (lower.includes('expired') || lower.includes('renew')) return 'Subscription renewal'
  if (imageAnalysis && imageAnalysis.includes('error')) return 'Error from screenshot'
  return 'General support inquiry'
}

router.post('/', async (req, res) => {
  const { sessionId, message, pageUrl, language: browserLang, images } = req.body
  if (!sessionId || !message) return res.status(400).json({ error: 'sessionId and message required' })

  const db = getDb()
  const wid = req.website ? req.website.id : 1

  // Get or create session
  let session = db.prepare('SELECT * FROM chat_sessions WHERE id = ?').get(sessionId)
  if (!session) {
    db.prepare('INSERT INTO chat_sessions (id, page_url, messages, website_id) VALUES (?, ?, ?, ?)').run(
      sessionId, pageUrl || '', '[]', wid
    )
    session = db.prepare('SELECT * FROM chat_sessions WHERE id = ?').get(sessionId)
  }

  const messages = JSON.parse(session.messages || '[]')

  // Handle image upload
  let imageAnalysis = null
  if (images && Array.isArray(images) && images.length > 0) {
    const imgData = images[0] // max 1 image per message
    if (imgData.length <= MAX_IMAGE_SIZE) {
      imageAnalysis = await analyzeImage(imgData, message)
      messages.push({
        role: 'user',
        text: message,
        image: { data: imgData.substring(0, 100) + '...[truncated]', analysis: imageAnalysis },
        timestamp: new Date().toISOString(),
      })
    } else {
      messages.push({
        role: 'user',
        text: message + ' [Image too large, could not process]',
        timestamp: new Date().toISOString(),
      })
    }
  } else {
    messages.push({ role: 'user', text: message, timestamp: new Date().toISOString() })
  }

  // Detect language (browser + IP geo + message keywords)
  const clientIP = getClientIP(req)
  const geoLang = await geoLookup(clientIP)
  const langHint = geoLang && !browserLang ? geoLang : browserLang
  const langInfo = detect(message, langHint)

  // Look up customer by email if we have one
  let customerData = null
  if (session.customer_email) {
    customerData = lookupByEmail(session.customer_email, db)
  }

  // Check for email in message (first time providing it)
  const emailMatch = message.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/)
  if (emailMatch && !session.customer_email) {
    const email = emailMatch[1].toLowerCase()
    db.prepare('UPDATE chat_sessions SET customer_email = ? WHERE id = ?').run(email, sessionId)
    session.customer_email = email
    customerData = lookupByEmail(email, db)
  }

  // Extract phone number if present
  const phoneMatch = message.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{2,9}/)
  if (phoneMatch && !session.customer_phone) {
    const phone = phoneMatch[0].trim()
    db.prepare('UPDATE chat_sessions SET customer_phone = ? WHERE id = ?').run(phone, sessionId)
    session.customer_phone = phone
  }

  // Determine visitor state
  const isExisting = customerData ? customerData.isExisting : false
  const abuseBlock = checkAbuse(customerData)

  // If abuse detected, modify the message to handle it
  let processedMessage = message
  if (abuseBlock === 'max_trials') {
    processedMessage = '[SYSTEM: This user has used 2+ trials already. Do not offer a free trial. Respond politely and steer to paid plans.] ' + message
  } else if (abuseBlock === 'active_trial') {
    processedMessage = '[SYSTEM: This user already has an active trial. Help them set it up. Do not offer another trial.] ' + message
  } else if (abuseBlock === 'flagged') {
    processedMessage = '[SYSTEM: This user has been flagged for potential abuse. Be helpful but do not offer free trials.] ' + message
  }

  // Append image analysis to message if available
  if (imageAnalysis) {
    processedMessage += `\n\n[SCREENSHOT ANALYSIS: ${imageAnalysis}]`
  }

  // Load providers
  const providerRows = db.prepare(`
    SELECT pc.*, pp.id as plan_id, pp.plan_name, pp.plan_type, pp.duration_days, pp.price_sell, pp.channels, pp.streams, pp.price_cost
    FROM providers_catalog pc
    LEFT JOIN provider_plans pp ON pp.provider_id = pc.id AND pp.active = 1
    WHERE pc.active = 1 AND pc.website_id = ?
    ORDER BY pc.name, pp.price_sell
  `).all(wid)

  const groupedProviders = []
  const providerMap = {}
  for (const row of providerRows) {
    if (!providerMap[row.id]) {
      providerMap[row.id] = { id: row.id, name: row.name, specialty: row.specialty, logo_url: row.logo_url, plans: [] }
      groupedProviders.push(providerMap[row.id])
    }
    if (row.plan_id) {
      providerMap[row.id].plans.push({
        id: row.plan_id,
        plan_name: row.plan_name,
        plan_type: row.plan_type,
        duration_days: row.duration_days,
        price_sell: row.price_sell,
        channels: row.channels,
        streams: row.streams,
      })
    }
  }

  // Get Alex's reply
  const alexResult = await getAlexReply({
    message: processedMessage,
    history: messages.slice(-20).map(m => ({ role: m.role, text: m.text })),
    providers: groupedProviders,
    language: browserLang,
    customerData,
    isExisting,
    previousSessions: customerData?.pastSessions,
  })

  const { reply, actions, language: replyLang } = alexResult

  // Enrich recommend_plan actions with DB data
  for (const a of actions) {
    if (a.action === 'recommend_plan') {
      const row = db.prepare(`
        SELECT pc.logo_url, pp.plan_name, pp.price_sell, pp.channels, pp.streams, pp.duration_days
        FROM providers_catalog pc
        JOIN provider_plans pp ON pp.provider_id = pc.id
        WHERE pc.id = ? AND pp.id = ?
      `).get(a.provider_id, a.plan_id)
      if (row) {
        a.logo_url = row.logo_url
        a.plan_name = row.plan_name
        a.price = String(row.price_sell ?? '0')
        a.channels = row.channels
        a.streams = row.streams
        a.duration_days = row.duration_days
      }
    }
  }

  messages.push({ role: 'assistant', text: reply, language: replyLang, timestamp: new Date().toISOString() })

  let orderId = session.order_id

  let collectedInfoThisBatch = false

  for (const action of actions) {
    if (action.action === 'collect_info') {
      collectedInfoThisBatch = true
      const orderResult = db.prepare(
        'INSERT INTO orders (session_id, provider_id, plan_id, is_trial, status) VALUES (?, ?, ?, ?, ?)'
      ).run(sessionId, action.provider_id, action.plan_id, action.is_trial ? 1 : 0, 'pending')
      orderId = orderResult.lastInsertRowid

      // Store known customer info on the order
      const orderUpdates = []
      if (session.customer_email) orderUpdates.push(`customer_email = '${session.customer_email.replace(/'/g, "''")}'`)
      if (session.customer_phone) orderUpdates.push(`customer_phone = '${session.customer_phone.replace(/'/g, "''")}'`)
      if (orderUpdates.length) {
        db.prepare(`UPDATE orders SET ${orderUpdates.join(', ')} WHERE id = ?`).run(orderId)
      }

      db.prepare('UPDATE chat_sessions SET order_id = ?, provider_interested = ?, plan_interested = ? WHERE id = ?').run(
        orderId, String(action.provider_id), String(action.plan_id), sessionId
      )
    }

    if (action.action === 'create_sellup_order') {
      if (collectedInfoThisBatch) continue // need a human round-trip first
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(action.order_id || orderId)
      if (order) {
        try {
          const productId = db.prepare('SELECT sellup_product_id FROM provider_plans WHERE id = ?').get(order.plan_id)?.sellup_product_id
          const result = await createPaymentLink({
            productId: productId || '',
            customerEmail: order.customer_email,
            customerName: order.customer_name,
            orderId: order.id,
          })
          const checkoutUrl = typeof result === 'string' ? result : result.checkoutUrl
          const sellupOrderId = typeof result === 'object' ? result.sellupOrderId : null
          if (sellupOrderId) {
            db.prepare('UPDATE orders SET sellup_order_id = ? WHERE id = ?').run(sellupOrderId, order.id)
          }
          await sendPaymentLink({ email: order.customer_email, name: order.customer_name, checkoutUrl })
          messages.push({
            role: 'assistant',
            text: `Here's your payment link: ${checkoutUrl}\n\nClick the button below to complete your purchase securely.`,
            timestamp: new Date().toISOString(),
            paymentLink: checkoutUrl,
          })
        } catch (e) {
          console.error('Sellup order error:', e)
        }
      }
    }

    if (action.action === 'send_trial') {
      if (collectedInfoThisBatch) continue // need a human round-trip before activating
      if (!hasTrialIntent(message, langInfo)) continue // user didn't ask for a trial
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(action.order_id || orderId)
      if (!order || !order.customer_email) continue // need email first
      const trialCreds = assignTrial(order.id, order.provider_id)
      if (trialCreds) {
        db.prepare('UPDATE orders SET trial_code_id = (SELECT id FROM trial_codes WHERE used_by_order_id = ?), status = ? WHERE id = ?').run(order.id, 'completed', order.id)
        db.prepare('UPDATE chat_sessions SET converted = 1 WHERE id = ?').run(sessionId)

        const provInfo = db.prepare(`
          SELECT pc.name as provider_name, pp.plan_name FROM providers_catalog pc
          JOIN provider_plans pp ON pp.provider_id = pc.id AND pp.id = ?
        `).get(order.plan_id)
        await sendTrial({
          email: order.customer_email,
          name: order.customer_name,
          credentials: trialCreds,
          durationHours: trialCreds.duration_hours,
          providerName: provInfo?.provider_name,
          planName: provInfo?.plan_name,
        })

        messages.push({
          role: 'assistant',
          text: `Trial activated! 🎉 I've sent your login credentials to ${order.customer_email}. Check your inbox and start watching immediately!`,
          timestamp: new Date().toISOString(),
          trialCredentials: true,
        })
      } else {
        db.prepare(
          "INSERT INTO admin_notifications (type, title, message, related_id) VALUES (?, ?, ?, ?)"
        ).run('trial_stockout', 'Trial codes exhausted',
          `Visitor ${order.customer_name || order.customer_email} requested a trial via chat but no codes are available.`,
          order.id);
        messages.push({
          role: 'assistant',
          text: "I'm sorry, we're out of trial codes at the moment. Would you like a paid plan instead?",
          timestamp: new Date().toISOString(),
        })
      }
    }

    if (action.action === 'show_checkout') {
      if (collectedInfoThisBatch) continue
      const checkoutPlan = db.prepare(`
        SELECT pp.*, pc.name as provider_name FROM provider_plans pp
        JOIN providers_catalog pc ON pc.id = pp.provider_id
        WHERE pp.id = ? AND pp.provider_id = ?
      `).get(action.plan_id, action.provider_id || 4)
      if (checkoutPlan) {
        action.checkoutData = checkoutPlan
        action.price = String(checkoutPlan.price_sell ?? '0')
      }
    }
  }

  // Generate and update issue summary
  try {
    const issueSummary = generateIssueSummary(message || '', imageAnalysis, replyLang)
    if (issueSummary && !session.issue_summary) {
      db.prepare('UPDATE chat_sessions SET issue_summary = ? WHERE id = ?').run(issueSummary, sessionId)
    }
  } catch (e) {
    console.warn('[Chat] Failed to generate issue summary:', e.message)
  }

  // Log action
  const logAction = actions.length > 0 ? `action_${actions[0].action}` : 'message'
  db.prepare('INSERT INTO agent_log (agent, action, details, order_id, session_id) VALUES (?, ?, ?, ?, ?)').run(
    'Alex', logAction, message.substring(0, 200), orderId, sessionId
  )

  // Update session messages and order_id
  db.prepare('UPDATE chat_sessions SET messages = ?, order_id = COALESCE(?, order_id) WHERE id = ?').run(
    JSON.stringify(messages), orderId, sessionId
  )

  const canEscalate = actions.some(a => a.action === 'escalate_to_human')
  res.json({ reply, actions, sessionId, language: replyLang, can_escalate: canEscalate })
})

module.exports = router;
