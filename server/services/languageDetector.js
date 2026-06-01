const LANGUAGE_MAP = {
  en: { name: 'English', dir: 'ltr' },
  fr: { name: 'Français', dir: 'ltr' },
  es: { name: 'Español', dir: 'ltr' },
  pt: { name: 'Português', dir: 'ltr' },
  hi: { name: 'हिन्दी', dir: 'ltr' },
  de: { name: 'Deutsch', dir: 'ltr' },
  it: { name: 'Italiano', dir: 'ltr' },
  nl: { name: 'Nederlands', dir: 'ltr' },
  ar: { name: 'العربية', dir: 'rtl' },
  tr: { name: 'Türkçe', dir: 'ltr' },
  pl: { name: 'Polski', dir: 'ltr' },
  ru: { name: 'Русский', dir: 'ltr' },
  zh: { name: '中文', dir: 'ltr' },
  ja: { name: '日本語', dir: 'ltr' },
  ko: { name: '한국어', dir: 'ltr' },
}

const LANGUAGE_KEYWORDS = {
  en: ['the', 'is', 'are', 'can', 'how', 'what', 'where', 'my', 'not', 'working', 'please', 'help', 'trial', 'subscribe', 'hello', 'hi', 'thanks', 'yes', 'no', 'i want', 'i have', 'i need', 'does not'],
  fr: ['bonjour', 'salut', 'merci', 'svp', 's\'il vous plaît', 'je veux', 'je suis', 'j\'ai', 'essai', 'abonnement', 'aide', 'ne marche pas', 'ne fonctionne', 'comment', 'pourquoi', 'combien', 'oui', 'non', 'merci beaucoup', 'mes', 'mon', 'ma'],
  es: ['hola', 'gracias', 'por favor', 'quiero', 'necesito', 'prueba', 'suscripción', 'ayuda', 'no funciona', 'cómo', 'cuánto', 'sí', 'no', 'mi', 'mis', 'tengo', 'estoy', 'puede', 'me puedes'],
  pt: ['olá', 'obrigado', 'por favor', 'quero', 'preciso', 'teste', 'assinatura', 'ajuda', 'não funciona', 'como', 'quanto', 'sim', 'não', 'meu', 'minha', 'tenho', 'estou'],
  de: ['hallo', 'danke', 'bitte', 'ich möchte', 'ich brauche', 'testen', 'abonnement', 'hilfe', 'funktioniert nicht', 'wie', 'was', 'kostet', 'ja', 'nein', 'mein', 'meine', 'ich habe', 'kannst du'],
  it: ['ciao', 'grazie', 'per favore', 'voglio', 'ho bisogno', 'prova', 'abbonamento', 'aiuto', 'non funziona', 'come', 'quanto', 'sì', 'no', 'mio', 'mia', 'ho', 'puoi'],
  nl: ['hallo', 'dank je', 'alsjeblieft', 'ik wil', 'ik heb', 'proef', 'abonnement', 'hulp', 'werkt niet', 'hoe', 'wat', 'kost', 'ja', 'nee', 'mijn', 'help me'],
  ar: ['مرحبا', 'شكرا', 'من فضلك', 'أريد', 'احتاج', 'تجربة', 'اشتراك', 'مساعدة', 'لا يعمل', 'كيف', 'كم', 'نعم', 'لا', 'عندي', 'مشكلة', 'ما هي', 'هل يمكن'],
  tr: ['merhaba', 'teşekkürler', 'lütfen', 'istiyorum', 'ihtiyacım var', 'deneme', 'abonelik', 'yardım', 'çalışmıyor', 'nasıl', 'ne kadar', 'evet', 'hayır', 'benim', 'var'],
  pl: ['cześć', 'dziekuję', 'proszę', 'chcę', 'potrzebuję', 'próba', 'subskrypcja', 'pomoc', 'nie działa', 'jak', 'ile', 'tak', 'nie', 'mój', 'moje'],
  ru: ['здравствуйте', 'привет', 'спасибо', 'пожалуйста', 'я хочу', 'мне нужно', 'пробный', 'подписка', 'помощь', 'не работает', 'как', 'сколько', 'да', 'нет', 'мой', 'моя', 'у меня'],
}

function detect(text, browserHint) {
  const lower = text.toLowerCase().trim()
  let lang = 'en'

  // Try browser hint first (navigator.language from frontend)
  if (browserHint && LANGUAGE_MAP[browserHint]) {
    lang = browserHint
  }

  // Score each language by keyword matches
  let bestScore = 0
  for (const [code, keywords] of Object.entries(LANGUAGE_KEYWORDS)) {
    let score = 0
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        score++
        // Give extra weight to longer/more specific keyword matches
        if (kw.length > 5) score += 0.5
      }
    }
    if (score > bestScore) {
      bestScore = score
      lang = code
    }
  }

  const info = LANGUAGE_MAP[lang] || LANGUAGE_MAP.en
  return { code: lang, name: info.name, dir: info.dir }
}

module.exports = { detect, LANGUAGE_MAP }
