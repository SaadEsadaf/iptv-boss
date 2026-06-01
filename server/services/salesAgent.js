const { generateText } = require('./aiProvider')

const SYSTEM_PROMPT = `You are Alex, a friendly IPTV technical sales agent for IPTV Boss.

# YOUR BEHAVIOR BY VISITOR STATE

## New Visitor (no email collected, no order)
- GOAL: Collect their email (required), name (optional), and WhatsApp (optional). Only act after they confirm.
- Start with a warm greeting and ask how you can help or what content they enjoy.
- If they say hi or ask a simple question (like "do you speak X?"), answer briefly and ask what they're looking for.
- Never activate anything without the visitor explicitly asking for it.
- Once they express interest, ask for their email (required), name (optional), and WhatsApp number (optional).
- Only output action JSON when the visitor has clearly said yes to an offer AND provided their email.
- If they ask a technical question about setup: give a BRIEF 1-2 sentence answer, then close with an offer.

## Info-Collected / Trial Visitor (email provided, order pending)
- GOAL: Activate their trial or complete their payment.
- Follow up on the status of their trial/payment.
- If they ask technical setup help: give moderate help (2-3 steps), then ask if they're watching or need anything else.
- Encourage them: make them feel supported and excited about the service.

## Existing Customer (has completed a paid order OR says they already bought)
- GOAL: Full technical support. No sales pitch.
- Be warm, patient, helpful. They already paid — treat them well.
- Ask what device they're using. Ask what exactly they see.
- If they mention an error: give the exact error text and step-by-step fix.
- If they say "it's not working": don't guess. Ask specific questions.
- Walk through each step one at a time, ask them to confirm what they see.
- Check if they've set it up on another device already.

# LANGUAGE RULES
- Detect the language the visitor is writing in. ALWAYS reply in the same language.
- If they write in French, reply in French. If Arabic, reply in Arabic. Etc.
- Match their tone: if they're frustrated, be sympathetic. If excited, be excited.

# KNOWLEDGE BASE
You have access to a knowledge base with detailed setup guides and troubleshooting.
Use it to answer technical questions accurately. When giving setup instructions:
1. First ask what device and app they're using
2. Give steps specific to that device/app
3. Ask them to confirm after each step

# SCREENSHOT ANALYSIS
If the user sends a screenshot image, analyze it carefully. Describe what you see:
- Is there an error message? Read it and explain it.
- Is it a settings page? Guide them through the visible fields.
- Is the screen blank or frozen? Suggest next steps.
Be specific about what you observe in the image.

# SALES FLOW
When recommending plans, output JSON in this format:
{"action": "recommend_plan", "provider_id": X, "plan_id": X, "provider_name": "X", "plan_name": "X", "price": "X.XX", "is_trial": true/false, "channels": X, "streams": X}
When ready to collect info:
{"action": "collect_info", "plan_id": X, "provider_id": X, "is_trial": true/false}
When payment link needed:
{"action": "create_sellup_order", "order_id": X, "plan_id": X, "amount": X.XX}
When trial ready to send:
{"action": "send_trial", "order_id": X}
IMPORTANT Only output action JSON when you're ready to perform the action. Do not output multiple actions in one message.

# CUSTOMER DATA (when available)
Below you'll find the customer's order history and past sessions.
Use this to personalize your response. If they have an active trial or order, reference it.
If they've contacted support before about the same issue, acknowledge it.
`

const FALLBACKS = {
  en: {
    welcome: "Welcome to IPTV Boss! 👋 I'm Alex. Are you looking for a free trial or ready to subscribe? What kind of content do you enjoy?",
    trial: "A free trial is a great way to start! I just need your name and email to set it up. What's your name?",
    trialReady: "Great! Your trial credentials have been sent to your email. Check your inbox and start watching! If you need help setting up, let me know. 🎉",
    sports: "Perfect for sports fans! StreamMax offers 10,000+ channels with excellent sports coverage including World Cup 2026, Premier League, and more. Would you like a free trial or a paid plan?",
    arabic: "UltraTV is our top choice for Arabic content — 8,000+ channels with the best Arabic programming. Would you like a free trial first or go for a paid plan?",
    europe: "ClearStream is excellent for European content — 12,000+ channels with great international coverage. Would you like a free trial or a paid plan?",
    pricing: "Great choice! Our plans start from $9.99/month. Could you share your name, email, phone, and country so I can send you the payment link?",
    existing: "Welcome back! I can see you're an existing customer. How can I help you with your IPTV setup today? What device are you using?",
    abuse: "It looks like you've already used your free trial. I'd love to help you get set up with a paid plan instead — our prices start from just $9.99/month!",
    technical: "I'd be happy to help you with that! First, could you tell me what device you're using (Firestick, Android TV, iPhone, etc.) and what exactly you're seeing on screen?",
  },
  fr: {
    welcome: "Bienvenue chez Atlas Pro IPTV France ! 👋 Je suis Alex. Cherchez-vous un essai gratuit ou êtes-vous prêt à vous abonner ? Quel type de contenu aimez-vous (sport, films, séries, etc.) ?",
    trial: "Un essai gratuit est parfait pour commencer ! J'ai juste besoin de votre nom et email pour le configurer. Quel est votre nom ?",
    trialReady: "Parfait ! Vos identifiants d'essai ont été envoyés à votre email. Vérifiez votre boîte de réception et commencez à regarder ! 🎉",
    sports: "Parfait pour les fans de sport ! Atlas Pro IPTV offre 25 000+ chaînes avec une excellente couverture sportive (Coupe du Monde 2026, LDC, Premier League, NBA, NFL en 4K). Voulez-vous un essai gratuit ou un abonnement payant ?",
    arabic: "Atlas Pro IPTV est notre meilleur choix pour le contenu arabe — 25 000+ chaînes avec une large sélection. Voulez-vous d'abord un essai gratuit ?",
    europe: "Atlas Pro IPTV est excellent pour le contenu européen — 25 000+ chaînes. Essai gratuit ou abonnement payant ?",
    atlas: "Atlas Pro IPTV est notre service premium français ! Nous proposons 25 000+ chaînes en 4K, avec les applications officielles Atlas Pro ONTV (Android/Fire TV) et Atlas Pro IPTV Ontv GSE (Apple). L'activation est simple : entrez votre code et regardez. Voulez-vous un essai gratuit pour tester ?",
    pricing: "Excellent choix ! Nos plans commencent à partir de 9,99 €/mois. Pourriez-vous partager votre nom, email, téléphone et pays pour que je vous envoie le lien de paiement ?",
    existing: "Bon retour ! Je vois que vous êtes un client existant. Comment puis-je vous aider avec votre configuration IPTV aujourd'hui ? Quel appareil utilisez-vous ?",
    abuse: "Vous avez déjà utilisé votre essai gratuit. Je serais ravi de vous aider à choisir un abonnement payant à partir de seulement 9,99 €/mois !",
    technical: "Je serai heureux de vous aider ! D'abord, pourriez-vous me dire quel appareil vous utilisez (Firestick, Android TV, iPhone, etc.) et ce que vous voyez à l'écran ?",
  },
  es: {
    welcome: "¡Bienvenido a IPTV Boss! 👋 Soy Alex. ¿Buscas una prueba gratuita o estás listo para suscribirte? ¿Qué tipo de contenido te gusta?",
    trial: "¡Una prueba gratuita es perfecta para empezar! Solo necesito tu nombre y email para configurarla. ¿Cuál es tu nombre?",
    trialReady: "¡Genial! Tus credenciales de prueba han sido enviadas a tu email. ¡Revisa tu bandeja de entrada y empieza a ver! 🎉",
    sports: "¡Perfecto para los amantes del deporte! StreamMax ofrece más de 10,000 canales con excelente cobertura deportiva. ¿Prueba gratuita o plan de pago?",
    arabic: "UltraTV es nuestra mejor opción para contenido árabe — más de 8,000 canales. ¿Quieres una prueba gratuita primero?",
    europe: "ClearStream es excelente para contenido europeo — más de 12,000 canales. ¿Prueba gratuita o plan de pago?",
    pricing: "¡Excelente elección! Nuestros planes desde $9.99/mes. ¿Podrías compartir tu nombre, email, teléfono y país?",
    existing: "¡Bienvenido de nuevo! Veo que eres un cliente existente. ¿Cómo puedo ayudarte con tu configuración IPTV hoy?",
    abuse: "Ya has usado tu prueba gratuita. ¡Me encantaría ayudarte a conseguir un plan de pago desde solo $9.99/mes!",
    technical: "¡Con gusto te ayudaré! Primero, ¿podrías decirme qué dispositivo usas (Firestick, Android TV, iPhone, etc.) y qué ves exactamente en la pantalla?",
  },
  ar: {
    welcome: "!👋 مرحباً بك في IPTV Boss. أنا أليكس. هل تبحث عن نسخة تجريبية مجانية أم أنك مستعد للاشتراك؟ ما نوع المحتوى الذي تستمتع به؟",
    trial: "النسخة التجريبية المجانية هي طريقة رائعة للبدء! أحتاج فقط إلى اسمك وبريدك الإلكتروني. ما هو اسمك؟",
    trialReady: "!🎉 رائع! تم إرسال بيانات النسخة التجريبية إلى بريدك الإلكتروني. تحقق من صندوق الوارد الخاص بك وابدأ المشاهدة",
    sports: "مثالي لعشاق الرياضة! StreamMax يقدم أكثر من 10,000 قناة مع تغطية رياضية ممتازة. هل تريد نسخة تجريبية مجانية أم اشتراك مدفوع؟",
    arabic: "UltraTV هو خيارنا الأفضل للمحتوى العربي — أكثر من 8,000 قناة. هل تريد نسخة تجريبية مجانية أولاً؟",
    europe: "ClearStream ممتاز للمحتوى الأوروبي — أكثر من 12,000 قناة. نسخة تجريبية مجانية أم اشتراك مدفوع؟",
    pricing: "!خيار رائع! خططنا تبدأ من 9.99 دولار شهرياً. هل يمكنك مشاركة اسمك وبريدك الإلكتروني ورقم هاتفك ودولتك",
    existing: "مرحباً بعودتك! أرى أنك عميل حالي. كيف يمكنني مساعدتك في إعداد IPTV الخاص بك اليوم؟",
    abuse: "لقد استخدمت نسختك التجريبية المجانية بالفعل. يسعدني مساعدتك في الحصول على اشتراك مدفوع يبدأ من 9.99 دولار شهرياً فقط!",
    technical: "يسعدني مساعدتك في ذلك! أولاً، هل يمكنك إخباري بالجهاز الذي تستخدمه (Firestick أو Android TV أو iPhone أو غيره) وماذا ترى بالضبط على الشاشة؟",
  },
  de: {
    welcome: "Willkommen bei IPTV Boss! 👋 Ich bin Alex. Suchen Sie eine kostenlose Testversion oder möchten Sie gleich abonnieren? Welche Inhalte interessieren Sie?",
    trial: "Ein kostenloser Test ist perfekt für den Anfang! Ich brauche nur Ihren Namen und Ihre E-Mail. Wie heißen Sie?",
    trialReady: "Toll! Ihre Testzugangsdaten wurden an Ihre E-Mail gesendet. Schauen Sie in Ihrem Posteingang nach und legen Sie los! 🎉",
    sports: "Perfekt für Sportfans! StreamMax bietet über 10.000 Sender mit exzellenter Sportberichterstattung. Kostenlos testen oder bezahlen?",
    arabic: "UltraTV ist unsere Top-Wahl für arabische Inhalte — über 8.000 Sender. Erst kostenlos testen?",
    europe: "ClearStream ist hervorragend für europäische Inhalte — über 12.000 Sender. Test oder Abo?",
    pricing: "Ausgezeichnete Wahl! Unsere Pläne beginnen bei 9,99 €/Monat. Können Sie mir Ihren Namen, E-Mail, Telefon und Land nennen?",
    existing: "Willkommen zurück! Sie sind bereits Kunde. Wie kann ich Ihnen heute bei Ihrem IPTV-Setup helfen?",
    abuse: "Sie haben Ihre kostenlose Testversion bereits genutzt. Ich helfe Ihnen gerne bei einem kostenpflichtigen Plan ab nur 9,99 €/Monat!",
    technical: "Ich helfe Ihnen gerne! Können Sie mir zuerst sagen, welches Gerät Sie verwenden (Firestick, Android TV, iPhone usw.) und was genau Sie auf dem Bildschirm sehen?",
  },
  nl: {
    welcome: "Welkom bij IPTV Boss! 👋 Ik ben Alex. Zoekt u een gratis proefversie of wilt u zich abonneren? Welke inhoud vindt u leuk?",
    trial: "Een gratis proefversie is een geweldige manier om te beginnen! Ik heb alleen uw naam en e-mail nodig. Wat is uw naam?",
    trialReady: "Geweldig! Uw proefgegevens zijn naar uw e-mail gestuurd. Controleer uw inbox en begin met kijken! 🎉",
    sports: "Perfect voor sportfans! StreamMax biedt 10.000+ zenders met uitstekende sportdekking. Gratis proefversie of betalend plan?",
    arabic: "UltraTV is onze topkeuze voor Arabische content — 8.000+ zenders. Eerst een gratis proefversie?",
    europe: "ClearStream is uitstekend voor Europese content — 12.000+ zenders. Proefversie of betalend plan?",
    pricing: "Uitstekende keuze! Onze abonnementen beginnen vanaf €9,99/maand. Kunt u uw naam, e-mail, telefoon en land delen?",
    existing: "Welkom terug! U bent een bestaande klant. Hoe kan ik u helpen met uw IPTV-installatie vandaag?",
    abuse: "U heeft uw gratis proefversie al gebruikt. Ik help u graag met een betalend abonnement vanaf slechts €9,99/maand!",
    technical: "Ik help u graag! Kunt u me eerst vertellen welk apparaat u gebruikt (Firestick, Android TV, iPhone, etc.) en wat u precies op het scherm ziet?",
  },
}

const LANGUAGE_CODES = Object.keys(FALLBACKS)

function buildProviderContext(providers) {
  let context = '\n\nAvailable providers and plans:\n'
  for (const p of providers) {
    context += `\nProvider: ${p.name} (Specialty: ${p.specialty || 'General'})\n`
    if (p.plans) {
      for (const plan of p.plans) {
        const price = plan.is_trial ? 'Free' : `$${plan.price_sell}`
        context += `  - ${plan.plan_name}: ${price}, ${plan.duration_days} days, ${plan.channels || '?'} channels\n`
      }
    }
  }
  return context
}

function parseActions(text) {
  const actions = []
  const jsonRegex = /\{("action":\s*"[^"]+".*?)\}/g
  let match
  while ((match = jsonRegex.exec(text)) !== null) {
    try {
      const action = JSON.parse(match[0])
      actions.push(action)
    } catch {
      // skip malformed JSON
    }
  }
  return actions
}

function detectLanguage(message, browserHint) {
  const { detect } = require('./languageDetector')
  return detect(message, browserHint)
}

function getFallback(key, langCode, replacements = {}) {
  const lang = LANGUAGE_CODES.includes(langCode) ? langCode : 'en'
  let text = FALLBACKS[lang][key] || FALLBACKS.en[key] || ''
  for (const [k, v] of Object.entries(replacements)) {
    text = text.replace(`{${k}}`, v)
  }
  return text
}

function fallbackReply(lower, langCode, isExisting) {
  const actions = []
  let reply

  // Existing customer asking for help
  if (isExisting && (lower.includes('help') || lower.includes('not working') || lower.includes('error') || lower.includes('problem') || lower.includes('fix') || lower.includes('setup') || lower.includes('how'))) {
    return { reply: getFallback('technical', langCode), actions }
  }

  // Trial flow
  if (lower.includes('trial') || lower.includes('try') || lower.includes('test') || lower.includes('free')) {
    if (lower.includes('name') || lower.includes('email') || lower.includes('@')) {
      actions.push({ action: 'send_trial', order_id: null })
      reply = getFallback('trialReady', langCode)
    } else {
      reply = getFallback('trial', langCode)
    }
    } else if (lower.includes('sport')) {
      actions.push({ action: 'recommend_plan', provider_id: 1, plan_id: 2, provider_name: 'StreamMax', plan_name: 'Basic', price: '14.99', is_trial: false, channels: 10000, streams: 1 })
      reply = getFallback('sports', langCode)
    } else if (lower.includes('atlas')) {
      reply = getFallback('atlas', langCode)
    } else if (lower.includes('arabic') || lower.includes('arab')) {
    actions.push({ action: 'recommend_plan', provider_id: 2, plan_id: 6, provider_name: 'UltraTV', plan_name: 'Basic', price: '12.99', is_trial: false, channels: 8000, streams: 1 })
    reply = getFallback('arabic', langCode)
  } else if (lower.includes('europe')) {
    actions.push({ action: 'recommend_plan', provider_id: 3, plan_id: 10, provider_name: 'ClearStream', plan_name: 'Basic', price: '9.99', is_trial: false, channels: 12000, streams: 1 })
    reply = getFallback('europe', langCode)
  } else if (lower.includes('price') || lower.includes('cost') || lower.includes('how much') || lower.includes('premium') || lower.includes('basic') || lower.includes('buy') || lower.includes('subscribe')) {
    actions.push({ action: 'collect_info', plan_id: 3, provider_id: 1, is_trial: false })
    reply = getFallback('pricing', langCode)
  } else if (isExisting) {
    reply = getFallback('existing', langCode)
  } else {
    reply = getFallback('welcome', langCode)
  }

  return { reply, actions }
}

function buildCustomerContext(customerData) {
  if (!customerData) return ''
  let ctx = '\n\n--- CUSTOMER DATA ---\n'

  if (customerData.isExisting) {
    ctx += `Status: Existing paid customer (email: ${customerData.email})\n`
  } else if (customerData.activeTrial) {
    ctx += `Status: Active trial user (email: ${customerData.email})\n`
  } else if (customerData.trialCount > 0) {
    ctx += `Status: Past trial user, trials used: ${customerData.trialCount} (email: ${customerData.email})\n`
  } else {
    ctx += `Status: New customer (email: ${customerData.email})\n`
  }

  if (customerData.completedOrders.length > 0) {
    ctx += 'Completed orders:\n'
    for (const order of customerData.completedOrders) {
      ctx += `  - ${order.provider_name || 'Unknown'} ${order.plan_name || 'Plan'} | ${order.is_trial ? 'Trial' : 'Paid'} | Status: ${order.status}\n`
    }
  }

  if (customerData.pastSessions.length > 0) {
    const recent = customerData.pastSessions.slice(0, 3)
    ctx += 'Recent chat sessions:\n'
    for (const s of recent) {
      if (s.issue_summary) ctx += `  - ${s.issue_summary} (${s.ticket_status})\n`
    }
  }

  if (customerData.abuseFlagged) {
    ctx += 'WARNING: This customer has been flagged for potential abuse in past sessions.\n'
  }

  ctx += '--- END CUSTOMER DATA ---\n'
  return ctx
}

async function getAlexReply({ message, history, providers, language, customerData, isExisting, previousSessions }) {
  const { detect } = require('./languageDetector')
  const { buildContext } = require('../data/iptvKnowledge')

  const langInfo = detect(message, language)
  const effectiveLang = langInfo.code

  const kbContext = buildContext(message, isExisting ? 'existing' : 'new')

  const providerCtx = providers ? buildProviderContext(providers) : ''
  const customerCtx = buildCustomerContext(customerData)

  const sysPrompt = SYSTEM_PROMPT + providerCtx + customerCtx + kbContext + `\n\nIMPORTANT: The visitor is writing in ${langInfo.name} (${langInfo.code}). Respond in ${langInfo.name}. Always use their language.`

  try {
    const msgs = [
      ...history.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.text || m.content || m.message || '',
      })),
      { role: 'user', content: message },
    ]

    const reply = await generateText({
      system: sysPrompt,
      messages: msgs,
      maxTokens: 800,
      task: 'chat',
    })

    const actions = parseActions(reply)
    const cleanReply = reply.replace(/\{"action":\s*"[^"]+".*?\}\s*/g, '').trim()
    return { reply: cleanReply, actions, language: effectiveLang }
  } catch (e) {
    if (e.message === 'AI_NOT_CONFIGURED' || e.message.includes('All AI providers failed')) {
      return { ...fallbackReply(message.toLowerCase(), effectiveLang, isExisting), language: effectiveLang }
    }
    console.error('Alex AI error:', e)
    return {
      reply: getFallback('technical', effectiveLang),
      actions: [],
      language: effectiveLang,
    }
  }
}

module.exports = { getAlexReply, SYSTEM_PROMPT, parseActions, detectLanguage, FALLBACKS }
