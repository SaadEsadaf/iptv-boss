const { generateText } = require('./aiProvider')

const SYSTEM_PROMPT = `You are Alex, a friendly IPTV technical sales agent for Dalletek.

# YOUR BEHAVIOR BY VISITOR STATE

## New Visitor (no email collected, no order)
- GOAL: Answer questions and direct to the "Get Free Trial" button or plan selection.
- Start with a warm greeting and ask how you can help or what content they enjoy.
- If they say hi or ask a simple question (like "do you speak X?"), answer briefly and ask what they're looking for.
- If they want a trial: tell them to click "Get Free Trial" button above. Do not collect their info yourself.
- If they want to buy: offer the available plans.
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

# TRIAL REDIRECT
When a visitor asks for a trial, tell them to click the "Get Free Trial" button and fill in their info. Do NOT collect their email or offer to send trial yourself.

# SALES FLOW
When a visitor says they want to buy or subscribe, ASK qualifying questions FIRST:
1. "What content do you watch? (sports, movies, series, all)"
2. "How many devices will you use? (1, 2, or 4?)"
3. "How long do you need? (1 month at €9.99, 3 months at €29.99, 6 months at €49.99, 12 months at €69.99)"

After they answer, RECOMMEND the perfect plan with a_recommend action:
{"action": "a_recommend", "provider_id": 4, "plan_id": X, "by": "for you — plan_name — price_sell€ — duration_days days — channels channels — streams streams"}

When recommending plans in a card, use:
{"action": "recommend_plan", "provider_id": X, "plan_id": X, "provider_name": "X", "plan_name": "X", "price": "X.XX", "is_trial": true/false, "channels": X, "streams": X}

When ready to show checkout popup:
{"action": "show_checkout", "plan_id": X, "provider_id": X}

When ready to collect info for order:
{"action": "collect_info", "plan_id": X, "provider_id": X, "is_trial": true/false}

When payment link needed:
{"action": "create_sellup_order", "order_id": X, "plan_id": X, "amount": X.XX}

NOTE: For trials, do NOT output any action JSON. Just tell them to click the "Get Free Trial" button.
IMPORTANT: Only output ONE action JSON per message. A_recommend outputs your recommendation text. Show_checkout triggers the popup.

# CUSTOMER DATA (when available)
Below you'll find the customer's order history and past sessions.
Use this to personalize your response. If they have an active trial or order, reference it.
If they've contacted support before about the same issue, acknowledge it.

# NEW PAGES & RESOURCES
- Blog: /blog — Articles about Atlas Pro IPTV, guides, comparisons, news (refer customers here for detailed reading)
- Support Center: /support — Searchable FAQ, installation guides by device, app download links, contact info
- Downloads: /downloads — All apps organized by device: Atlas Pro ONTV (Android/Fire TV), Atlas Pro IPTV Ontv GSE (iOS), TiviMate, IPTV Smarters, GSE Smart IPTV, VLC
- Activation: /activate?token=EMAIL — Step-by-step setup guide with credentials display

# APP DOWNLOAD LINKS
When customers ask where to download apps, share:
- Atlas Pro ONTV (Android TV / Fire TV): Download from https://atlaspro.tv/atlas-pro-ontv.apk or Amazon App Store
- Atlas Pro IPTV Ontv GSE (iPhone/iPad/Apple TV): Apple App Store
- TiviMate (Firestick/Android TV): Google Play or Amazon App Store
- IPTV Smarters (all devices): Google Play, App Store, or Amazon
- GSE Smart IPTV (iPhone/iPad/Apple TV): Apple App Store
- VLC (PC/Mac): videolan.org

# ACTIVATION GUIDE
After purchase, customers receive an email with:
1. An Activation Code — for official Atlas Pro apps (simpler, no config needed)
2. Xtream Codes credentials — username, password, server URL — for third-party apps (TiviMate, Smarters, etc.)
For official app: install → open → enter activation code → watch.
For third-party app: install → select "Xtream Codes API" → enter server/username/password → watch.
Send customers to /activate?token=EMAIL for full per-device guides.

# CONTACT INFO
Our WhatsApp number is {WHATSAPP_NUMBER} — share it when customers want direct support.
`

const FALLBACKS = {
  en: {
    welcome: "Welcome to Dalletek! 👋 I'm Alex. Are you looking for a free trial or ready to subscribe? What kind of content do you enjoy?",
    trial: "You can click on 'Get Free Trial' and fill in your info, and you will get your trial instantly! 🎉",
    trialReady: "Great! Click on the 'Get Free Trial' button above to fill in your info and get started instantly! 🎉",
    sports: "Perfect for sports fans! StreamMax offers 10,000+ channels with excellent sports coverage including World Cup 2026, Premier League, and more. Would you like a free trial or a paid plan?",
    arabic: "UltraTV is our top choice for Arabic content — 8,000+ channels with the best Arabic programming. Would you like a free trial first or go for a paid plan?",
    europe: "ClearStream is excellent for European content — 12,000+ channels with great international coverage. Would you like a free trial or a paid plan?",
    pricing: "Great choice! Our plans start from $9.99/month. Could you share your name, email, phone, and country so I can send you the payment link?",
    existing: "Welcome back! I can see you're an existing customer. How can I help you with your IPTV setup today? What device are you using?",
    abuse: "It looks like you've already used your free trial. You can still click 'Get Free Trial' to see available options, or I can help you with a paid plan from just $9.99/month!",
    contact: "For direct support, you can also reach us on WhatsApp at {whatsapp} — we're here to help!",
    technical: "I'd be happy to help you with that! First, could you tell me what device you're using (Firestick, Android TV, iPhone, etc.) and what exactly you're seeing on screen?",
    qualify: "To help you pick the perfect plan:\n\n1️⃣ What content do you watch? (Sports, Movies, Series, or All)\n2️⃣ How many devices? (1, 2, or 4)\n3️⃣ How long? (1 month = €9.99, 3 months = €29.99, 6 months = €49.99, 12 months = €69.99)\n\nTell me a bit about what you need!",
    choosePlan: "Here's what I'd recommend:\n\n📺 {plan_name}\n💶 €{price_sell}\n📅 {duration_days} days\n📡 {streams} device(s)\n\nJust click the button below to checkout! 👇",
  },
  fr: {
    welcome: "Bienvenue chez Atlas Pro IPTV France ! 👋 Je suis Alex. Cherchez-vous un essai gratuit ou êtes-vous prêt à vous abonner ? Quel type de contenu aimez-vous (sport, films, séries, etc.) ?",
    trial: "Vous pouvez cliquer sur 'Obtenir un Essai Gratuit' et remplir vos informations, et vous recevrez votre essai instantanément ! 🎉",
    trialReady: "Parfait ! Cliquez sur le bouton 'Obtenir un Essai Gratuit' ci-dessus pour remplir vos informations et commencer instantanément ! 🎉",
    sports: "Parfait pour les fans de sport ! Atlas Pro IPTV offre 25 000+ chaînes avec une excellente couverture sportive (Coupe du Monde 2026, LDC, Premier League, NBA, NFL en 4K). Voulez-vous un essai gratuit ou un abonnement payant ?",
    arabic: "Atlas Pro IPTV est notre meilleur choix pour le contenu arabe — 25 000+ chaînes avec une large sélection. Voulez-vous d'abord un essai gratuit ?",
    europe: "Atlas Pro IPTV est excellent pour le contenu européen — 25 000+ chaînes. Essai gratuit ou abonnement payant ?",
    atlas: "Atlas Pro IPTV est notre service premium français ! Nous proposons 25 000+ chaînes en 4K, avec les applications officielles Atlas Pro ONTV (Android/Fire TV) et Atlas Pro IPTV Ontv GSE (Apple). L'activation est simple : entrez votre code et regardez. Voulez-vous un essai gratuit pour tester ?",
    pricing: "Excellent choix ! Nos plans commencent à partir de 9,99 €/mois. Pourriez-vous partager votre nom, email, téléphone et pays pour que je vous envoie le lien de paiement ?",
    existing: "Bon retour ! Je vois que vous êtes un client existant. Comment puis-je vous aider avec votre configuration IPTV aujourd'hui ? Quel appareil utilisez-vous ?",
    abuse: "Vous avez déjà utilisé votre essai gratuit. Vous pouvez toujours cliquer sur 'Obtenir un Essai Gratuit' ou choisir un abonnement payant à partir de 9,99 €/mois !",
    contact: "Pour un support direct, vous pouvez aussi nous contacter sur WhatsApp au {whatsapp} — nous sommes là pour vous aider !",
    technical: "Je serai heureux de vous aider ! D'abord, pourriez-vous me dire quel appareil vous utilisez (Firestick, Android TV, iPhone, etc.) et ce que vous voyez à l'écran ?",
    qualify: "Pour vous aider à choisir le plan parfait :\n\n1️⃣ Quel contenu regardez-vous ? (Sport, Films, Séries, ou Tout)\n2️⃣ Combien d'appareils ? (1, 2, ou 4)\n3️⃣ Pour combien de temps ? (1 mois = 9,99€, 3 mois = 29,99€, 6 mois = 49,99€, 12 mois = 69,99€)\n\nDites-m'en un peu plus sur vos besoins !",
    choosePlan: "Voici ce que je vous recommande :\n\n📺 {plan_name}\n💶 {price_sell}€\n📅 {duration_days} jours\n📡 {streams} appareil(s)\n\nCliquez sur le bouton ci-dessous pour commander ! 👇",
  },
  es: {
    welcome: "¡Bienvenido a Dalletek! 👋 Soy Alex. ¿Buscas una prueba gratuita o estás listo para suscribirte? ¿Qué tipo de contenido te gusta?",
    trial: "¡Puedes hacer clic en 'Obtener Prueba Gratis' y llenar tus datos, y recibirás tu prueba al instante! 🎉",
    trialReady: "¡Genial! Haz clic en el botón 'Obtener Prueba Gratis' arriba para llenar tus datos y empezar al instante! 🎉",
    sports: "¡Perfecto para los amantes del deporte! StreamMax ofrece más de 10,000 canales con excelente cobertura deportiva. ¿Prueba gratuita o plan de pago?",
    arabic: "UltraTV es nuestra mejor opción para contenido árabe — más de 8,000 canales. ¿Quieres una prueba gratuita primero?",
    europe: "ClearStream es excelente para contenido europeo — más de 12,000 canales. ¿Prueba gratuita o plan de pago?",
    pricing: "¡Excelente elección! Nuestros planes desde $9.99/mes. ¿Podrías compartir tu nombre, email, teléfono y país?",
    existing: "¡Bienvenido de nuevo! Veo que eres un cliente existente. ¿Cómo puedo ayudarte con tu configuración IPTV hoy?",
    abuse: "Ya has usado tu prueba gratuita. Puedes hacer clic en 'Obtener Prueba Gratis' o elegir un plan de pago desde $9.99/mes!",
    technical: "¡Con gusto te ayudaré! Primero, ¿podrías decirme qué dispositivo usas (Firestick, Android TV, iPhone, etc.) y qué ves exactamente en la pantalla?",
  },
  ar: {
    welcome: "!👋 مرحباً بك في Dalletek. أنا أليكس. هل تبحث عن نسخة تجريبية مجانية أم أنك مستعد للاشتراك؟ ما نوع المحتوى الذي تستمتع به؟",
    trial: "!🎉 يمكنك النقر على 'الحصول على نسخة تجريبية مجانية' وملء معلوماتك، وستحصل على نسختك التجريبية فوراً",
    trialReady: "!🎉 رائع! انقر على زر 'الحصول على نسخة تجريبية مجانية' أعلاه لملء معلوماتك والبدء فوراً",
    sports: "مثالي لعشاق الرياضة! StreamMax يقدم أكثر من 10,000 قناة مع تغطية رياضية ممتازة. هل تريد نسخة تجريبية مجانية أم اشتراك مدفوع؟",
    arabic: "UltraTV هو خيارنا الأفضل للمحتوى العربي — أكثر من 8,000 قناة. هل تريد نسخة تجريبية مجانية أولاً؟",
    europe: "ClearStream ممتاز للمحتوى الأوروبي — أكثر من 12,000 قناة. نسخة تجريبية مجانية أم اشتراك مدفوع؟",
    pricing: "!خيار رائع! خططنا تبدأ من 9.99 دولار شهرياً. هل يمكنك مشاركة اسمك وبريدك الإلكتروني ورقم هاتفك ودولتك",
    existing: "مرحباً بعودتك! أرى أنك عميل حالي. كيف يمكنني مساعدتك في إعداد IPTV الخاص بك اليوم؟",
    abuse: "!لقد استخدمت نسختك التجريبية المجانية بالفعل. يمكنك النقر على 'الحصول على نسخة تجريبية مجانية' أو اختيار اشتراك مدفوع يبدأ من 9.99 دولار شهرياً",
    technical: "يسعدني مساعدتك في ذلك! أولاً، هل يمكنك إخباري بالجهاز الذي تستخدمه (Firestick أو Android TV أو iPhone أو غيره) وماذا ترى بالضبط على الشاشة؟",
  },
  de: {
    welcome: "Willkommen bei Dalletek! 👋 Ich bin Alex. Suchen Sie eine kostenlose Testversion oder möchten Sie gleich abonnieren? Welche Inhalte interessieren Sie?",
    trial: "Sie können auf 'Kostenlosen Test erhalten' klicken und Ihre Daten eingeben, und Sie erhalten Ihren Test sofort! 🎉",
    trialReady: "Toll! Klicken Sie oben auf 'Kostenlosen Test erhalten', um Ihre Daten einzugeben und sofort zu starten! 🎉",
    sports: "Perfekt für Sportfans! StreamMax bietet über 10.000 Sender mit exzellenter Sportberichterstattung. Kostenlos testen oder bezahlen?",
    arabic: "UltraTV ist unsere Top-Wahl für arabische Inhalte — über 8.000 Sender. Erst kostenlos testen?",
    europe: "ClearStream ist hervorragend für europäische Inhalte — über 12.000 Sender. Test oder Abo?",
    pricing: "Ausgezeichnete Wahl! Unsere Pläne beginnen bei 9,99 €/Monat. Können Sie mir Ihren Namen, E-Mail, Telefon und Land nennen?",
    existing: "Willkommen zurück! Sie sind bereits Kunde. Wie kann ich Ihnen heute bei Ihrem IPTV-Setup helfen?",
    abuse: "Sie haben Ihre kostenlose Testversion bereits genutzt. Klicken Sie auf 'Kostenlosen Test erhalten' oder wählen Sie einen kostenpflichtigen Plan ab 9,99 €/Monat!",
    technical: "Ich helfe Ihnen gerne! Können Sie mir zuerst sagen, welches Gerät Sie verwenden (Firestick, Android TV, iPhone usw.) und was genau Sie auf dem Bildschirm sehen?",
  },
  nl: {
    welcome: "Welkom bij Dalletek! 👋 Ik ben Alex. Zoekt u een gratis proefversie of wilt u zich abonneren? Welke inhoud vindt u leuk?",
    trial: "U kunt klikken op 'Gratis proefversie krijgen' en uw gegevens invullen, en u ontvangt uw proefversie direct! 🎉",
    trialReady: "Geweldig! Klik op de knop 'Gratis proefversie krijgen' hierboven om uw gegevens in te vullen en meteen te starten! 🎉",
    sports: "Perfect voor sportfans! StreamMax biedt 10.000+ zenders met uitstekende sportdekking. Gratis proefversie of betalend plan?",
    arabic: "UltraTV is onze topkeuze voor Arabische content — 8.000+ zenders. Eerst een gratis proefversie?",
    europe: "ClearStream is uitstekend voor Europese content — 12.000+ zenders. Proefversie of betalend plan?",
    pricing: "Uitstekende keuze! Onze abonnementen beginnen vanaf €9,99/maand. Kunt u uw naam, e-mail, telefoon en land delen?",
    existing: "Welkom terug! U bent een bestaande klant. Hoe kan ik u helpen met uw IPTV-installatie vandaag?",
    abuse: "U heeft uw gratis proefversie al gebruikt. Klik op 'Gratis proefversie krijgen' of kies een betalend abonnement vanaf €9,99/maand!",
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

  // Contact/WhatsApp
  if (lower.includes('whatsapp') || lower.includes('whatapp')) {
    let whatsapp = '';
    try {
      const { getDb } = require('./db');
      const row = getDb().prepare("SELECT value FROM app_settings WHERE key = 'whatsapp_number'").get();
      whatsapp = row?.value || '';
    } catch {}
    reply = getFallback('contact', langCode, { whatsapp: whatsapp || 'not configured' });
    return { reply, actions };
  }

  // Trial flow — just redirect to the button
  if (lower.includes('trial') || lower.includes('try') || lower.includes('test') || lower.includes('free')) {
    reply = getFallback('trial', langCode)
  } else if (lower.includes('sport')) {
    actions.push({ action: 'recommend_plan', provider_id: 4, plan_id: 17, provider_name: 'Atlas', plan_name: 'Premium 3 Mois', price: '29.99', is_trial: false, channels: 179915, streams: 4 })
    reply = getFallback('sports', langCode)
  } else if (lower.includes('atlas')) {
    reply = getFallback('atlas', langCode)
  } else if (lower.includes('arabic') || lower.includes('arab')) {
    actions.push({ action: 'recommend_plan', provider_id: 4, plan_id: 15, provider_name: 'Atlas', plan_name: 'Premium', price: '14.99', is_trial: false, channels: 20000, streams: 2 })
    reply = getFallback('arabic', langCode)
  } else if (lower.includes('europe')) {
    actions.push({ action: 'recommend_plan', provider_id: 4, plan_id: 17, provider_name: 'Atlas', plan_name: 'Premium 3 Mois', price: '29.99', is_trial: false, channels: 179915, streams: 4 })
    reply = getFallback('europe', langCode)
  } else if (lower.includes('price') || lower.includes('cost') || lower.includes('how much') || lower.includes('premium') || lower.includes('basic') || lower.includes('buy') || lower.includes('subscribe')) {
    // Qualifying questions for purchase intent
    const hasAnswered = lower.includes('1') || lower.includes('2') || lower.includes('3') || lower.includes('4 stream') || lower.includes('2 stream') || lower.includes('1 stream') || lower.includes('stream') || lower.includes('device') || lower.includes('month') || lower.includes('year') || lower.includes('week') || lower.includes('jour') || lower.includes('mois') || lower.includes('semaine') || lower.includes('device') || lower.includes('appareil')
    if (hasAnswered) {
      // Pick best plan based on keywords
      const wantsYear = lower.includes('year') || lower.includes('annuel') || lower.includes('an') || lower.includes('12') || lower.includes('12 mois') || lower.includes('365')
      const wantsQuarter = lower.includes('3 month') || lower.includes('3 mois') || lower.includes('quarter') || lower.includes('trimestre') || lower.includes('90')
      const wantsSemester = lower.includes('6 month') || lower.includes('6 mois') || lower.includes('semestre') || lower.includes('semester') || lower.includes('180')
      const wantsPremium = lower.includes('4k') || lower.includes('4 devices') || lower.includes('4 appareil') || lower.includes('premium')
      let planId = 15, planName = 'Premium', price = '14.99', dur = '30', streams = '2', channels = '20000'
      if (wantsYear) { planId = 16; planName = 'Annuel 12 Mois'; price = '69.99'; dur = '365'; streams = '4'; channels = '25000' }
      else if (wantsSemester) { planId = 18; planName = 'Semestre 6 Mois'; price = '49.99'; dur = '180'; streams = '4'; channels = '179915' }
      else if (wantsQuarter && wantsPremium) { planId = 17; planName = 'Premium 3 Mois'; price = '29.99'; dur = '90'; streams = '4'; channels = '179915' }
      else if (wantsQuarter) { planId = 17; planName = 'Premium 3 Mois'; price = '29.99'; dur = '90'; streams = '4'; channels = '179915' }
      actions.push({ action: 'recommend_plan', provider_id: 4, plan_id: planId, provider_name: 'Atlas', plan_name: planName, price, is_trial: false, channels: Number(channels), streams: Number(streams) })
      reply = getFallback('choosePlan', langCode, { plan_name: planName, price_sell: price, duration_days: dur, streams })
    } else {
      reply = getFallback('qualify', langCode)
    }
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

const GREETINGS = [
  'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening',
  'bonjour', 'salut', 'bonsoir', 'coucou',
  'hola', 'buenos dias', 'buenas tardes',
  'hallo', 'guten tag', 'guten morgen', 'guten abend',
  'ciao', 'salve', 'buongiorno', 'buonasera',
  'hallo', 'goedemorgen', 'goedenavond',
  'marhaba', 'ahlan', 'salam',
  'merhaba', 'selam',
  'ola', 'bom dia', 'boa tarde',
  'privet', 'zdravstvuyte',
  'annyeong', 'konnichiwa', 'nihao', 'nin hao',
]

function isGreetingOnly(msg) {
  const clean = msg.toLowerCase().trim().replace(/[?!.,;:]+/g, '').replace(/\s+/g, ' ').trim()
  if (clean.length > 20) return false
  const words = clean.split(/\s+/).filter(w => w.length > 1)
  if (words.length > 3) return false
  return words.some(w => GREETINGS.includes(w))
}

async function getAlexReply({ message, history, providers, language, customerData, isExisting, previousSessions }) {
  const { detect } = require('./languageDetector')
  const { buildContext } = require('../data/iptvKnowledge')

  const langInfo = detect(message, language)
  const effectiveLang = langInfo.code

  // Fast path: pure greeting → skip AI entirely
  if (isGreetingOnly(message) && history.length < 2) {
    return { reply: getFallback('welcome', effectiveLang), actions: [], language: effectiveLang }
  }

  const kbContext = buildContext(message, isExisting ? 'existing' : 'new')

  const providerCtx = providers ? buildProviderContext(providers) : ''
  const customerCtx = buildCustomerContext(customerData)

  let whatsappNumber = '';
  try {
    const { getDb } = require('./db');
    const row = getDb().prepare("SELECT value FROM app_settings WHERE key = 'whatsapp_number'").get();
    whatsappNumber = row?.value || '';
  } catch {}

  const sysPrompt = (SYSTEM_PROMPT + providerCtx + customerCtx + kbContext)
    .replace('{WHATSAPP_NUMBER}', whatsappNumber || 'not configured')
    + `\n\nIMPORTANT: The visitor is writing in ${langInfo.name} (${langInfo.code}). Respond in ${langInfo.name}. Always use their language.`

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
      maxTokens: 400,
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
