import { useState, useEffect, useRef } from 'react'
import ChatWidget from '../components/ChatWidget'
import CheckoutModal from '../components/CheckoutModal'
import AuthModal from '../components/AuthModal'
import UserMenu from '../components/UserMenu'
import api from '../api'

const LUX_TEMPLATES = {
  cinematic: {
    name: '🎬 Cinematic',
    accent: '#ff6b35',
    gradient: 'linear-gradient(135deg, #ff6b35, #ff2d92)',
    bg: '#0a0a0f',
    cardBg: '#141420',
  },
  neon: {
    name: '💥 Neon Night',
    accent: '#00f0ff',
    gradient: 'linear-gradient(135deg, #00f0ff, #7b2dff)',
    bg: '#050510',
    cardBg: '#0d0d20',
  },
  gold: {
    name: '👑 Gold Elite',
    accent: '#ffd700',
    gradient: 'linear-gradient(135deg, #ffd700, #ff8c00)',
    bg: '#0a0a0a',
    cardBg: '#1a1a10',
  },
  green: {
    name: '🌿 Emerald',
    accent: '#00ff88',
    gradient: 'linear-gradient(135deg, #00ff88, #00cc66)',
    bg: '#050f0a',
    cardBg: '#0d1f15',
  },
}

const LUX_EN = {
  badge: '✧ LUXSTREAM Premium IPTV',
  heroTitle: 'Cinema at Home.<br />Every Channel. Every Moment.',
  heroDesc: 'Live sports, blockbuster movies, and trending series — all in stunning 4K HDR. One subscription, infinite entertainment.',
  watchNow: '▶ Watch Now',
  freeTrial: '✦ Free Trial',
  liveTv: 'Live TV', movies: 'Movies', series: 'Series', sports: 'Sports',
  worldCup: 'FIFA World Cup 2026',
  worldCupSub: 'Every match live in 4K HDR — Group Stage to Final',
  moviesOnDemand: 'Movies On Demand',
  moviesSub: '10,000+ blockbusters from Hollywood to Bollywood',
  trendingSeries: 'Trending Series',
  seriesSub: 'Full seasons of the hottest shows, new episodes daily',
  liveSports: 'Live Sports',
  sportsSub: 'Premier League, NBA, UFC, and 25,000+ channels',
  features: 'Features',
  plans: 'Plans',
  faq: 'FAQ',
  premiumContent: 'Premium Content',
  everythingWatch: 'Everything You Want to Watch',
  everythingDesc: 'From live sports to blockbuster movies — LuxStream delivers the ultimate entertainment experience.',
  watchFreeTrial: 'Watch Free Trial',
  channelsLabel: 'Channels',
  qualityLabel: 'Quality',
  bufferingLabel: 'Zero Buffering',
  setupLabel: 'Setup',
  secureLabel: 'Secure & Private',
  marqueeWorldCup: '⚽ FIFA WC 2026 — All 64 Matches Live in 4K',
  marqueeMovies: '🎬 10,000+ Movies On Demand',
  marqueeSeries: '📺 5,000+ TV Series — Full Seasons',
  marqueePremier: '🔥 Premier League — Every Match Live',
  marqueeSports: '🎯 NBA, NFL, UFC — All Sports 24/7',
  marqueeSetup: '⚡ Instant Setup — Under 5 Minutes',
  marqueeChannels: '🌍 25,000+ Channels — Global Coverage',
  worldCupLive: 'FIFA 2026 — All 64 Matches Live',
  groupStage: '🏆 Group Stage',
  knockout: '⚡ Knockout',
  final: '🎯 Final',
  allIn4k: '📺 All in 4K HDR',
  tagMatches: '64 Matches', tagHdr: '4K HDR', tagLang: 'All Languages', tagReplay: 'Replay',
  tagNetflix: 'Netflix Style', tagSeasons: 'Full Seasons', tagDaily: 'Daily Updates', tagHd: 'HD',
  badgeLive: 'LIVE 2026', badgeHot: '🔥 HOT', badgeVod: 'VOD', badgeSeries: 'SERIES', badgeLiveInd: 'LIVE',
  featChannels: '25,000+ Channels', featChannelsDesc: 'Every country, every category',
  trialHeading: "Hey! Let's set up your free trial.",
  trialDesc: 'Fill in your details below and we\'ll send you your credentials instantly.',
  nameLabel: 'Your Name (optional)', namePlaceholder: 'John Doe',
  emailLabel: 'Email Address *', emailPlaceholder: 'john@example.com',
  whatsappLabel: 'WhatsApp (optional)', whatsappPlaceholder: '+1234567890',
  providerLabel: 'Choose Provider *', selectProvider: 'Select provider',
  sendingTrial: 'Sending your trial...', getTrial: '🎁 Get My Free Trial',
  trialReady: 'Your trial is ready!', sentTo: 'We sent your credentials to:',
  provider: 'Provider:', duration: 'Duration:', hours: 'hours',
  upgrade: '💳 Upgrade to Full Plan', close: 'Close',
  trialFailed: 'Trial request failed', networkError: 'Network error. Please try again.',
  featQuality: '4K HDR Quality', featQualityDesc: 'Crystal clear streaming',
  featBuffer: 'Zero Buffering', featBufferDesc: '99.9% uptime guaranteed',
  featDevices: 'All Devices', featDevicesDesc: 'Smart TV, Firestick, Mobile',
  featSupport: '24/7 Support', featSupportDesc: 'Real humans, fast replies',
  featSecure: 'Secure & Private', featSecureDesc: 'No logs, encrypted',
  pricingTitle: 'Choose Your Plan',
  pricingSub: 'All plans include 4K streaming, multi-device support, and 24/7 support.',
  monthly: 'Monthly', yearly: 'Yearly', save: 'Save 20%',
  mostPopular: 'Most Popular',
  getStarted: 'Get Started',
  subscribe: 'Subscribe Now',
  testimonials: 'Testimonials',
  testimonialsTitle: 'What Viewers Say',
  testimonialsSub: 'Join thousands of satisfied customers worldwide.',
  faqTitle: 'Frequently Asked Questions',
  ctaTitle: 'Ready for the Best IPTV Experience?',
  ctaDesc: 'Start your free trial today. No credit card required.',
  startFree: '✦ Start Free Trial',
  footerDesc: 'LuxStream Premium IPTV — 25,000+ channels, 4K quality, instant activation worldwide.',
  quickLinks: 'Quick Links', support: 'Support', legal: 'Legal',
  channels: 'Channels', devices: 'Devices', uptime: 'Uptime', streams: 'Streams',
  allDevices: 'All Devices', zeroBuffer: 'Zero Buffering', hd4k: 'HD & 4K HDR', support24: '24/7 Support',
  worldCupTitle: 'FIFA World Cup 2026',
  worldCupDesc: 'All 64 matches live in 4K HDR. Group stages, knockout rounds, and the final — every moment captured.',
  moviesTitle: '10,000+ Movies VOD',
  moviesDesc: 'From Hollywood blockbusters to Arabic cinema, Bollywood hits to indie films. New titles added weekly.',
  seriesTitle: '5,000+ TV Series',
  seriesDesc: 'Complete seasons of trending series, Netflix-style originals, and classic favorites. Binge-watch ready.',
  sportsTitle: 'Live Sports 24/7',
  sportsDesc: 'Premier League, Champions League, NBA, NFL, UFC, F1 — every major sporting event, live.',
  faq1Q: 'What is LuxStream?', faq1A: 'LuxStream is a premium IPTV service delivering 25,000+ live TV channels, 10,000+ movies, and 5,000+ series in 4K HDR quality over the internet. Compatible with Smart TV, Firestick, Android, iOS, and more.',
  faq2Q: 'How fast is setup?', faq2A: 'Setup takes under 5 minutes. Choose your plan, receive your credentials by email, enter them in any IPTV app (TiviMate, IPTV Smarters, GSE, etc.), and start watching immediately.',
  faq3Q: 'Can I watch the World Cup?', faq3A: 'Yes! All 64 FIFA World Cup 2026 matches are broadcast live in 4K HDR. Our sports package includes every major league — Premier League, La Liga, Serie A, Champions League, NBA, NFL, and more.',
  faq4Q: 'What devices work?', faq4A: 'Smart TV (Samsung, LG, Sony), Amazon Firestick, Android TV, Android phones/tablets, iOS/Apple TV, MAG boxes, and any device supporting IPTV apps like TiviMate, IPTV Smarters, or GSE.',
  faq5Q: 'Is there a free trial?', faq5A: 'Yes! Click the chat bubble to claim your free trial — no credit card required. Test all 25,000+ channels risk-free for up to 72 hours.',
  q1: 'What is LuxStream?', q2: 'How fast is setup?', q3: 'Can I watch the World Cup?', q4: 'What devices work?', q5: 'Is there a free trial?',
  a1: 'LuxStream is a premium IPTV service delivering 25,000+ live TV channels, 10,000+ movies, and 5,000+ series in 4K HDR quality over the internet. Compatible with Smart TV, Firestick, Android, iOS, and more.',
  a2: 'Setup takes under 5 minutes. Choose your plan, receive your credentials by email, enter them in any IPTV app (TiviMate, IPTV Smarters, GSE, etc.), and start watching immediately.',
  a3: 'Yes! All 64 FIFA World Cup 2026 matches are broadcast live in 4K HDR. Our sports package includes every major league — Premier League, La Liga, Serie A, Champions League, NBA, NFL, and more.',
  a4: 'Smart TV (Samsung, LG, Sony), Amazon Firestick, Android TV, Android phones/tablets, iOS/Apple TV, MAG boxes, and any device supporting IPTV apps like TiviMate, IPTV Smarters, or GSE.',
  a5: 'Yes! Click the chat bubble to claim your free trial — no credit card required. Test all 25,000+ channels risk-free for up to 72 hours.',
  t1: '"Finally switched from cable and never looked back. The World Cup in 4K was absolutely incredible. Best IPTV service I\'ve used."',
  t1n: 'Ahmed K.', t1t: 'Sports Fan',
  t2: '"The movie library is massive — Hollywood, Arabic, Bollywood, everything. And it all streams in perfect 4K on my Smart TV."',
  t2n: 'Sarah M.', t2t: 'Movie Lover',
  t3: '"Setup was 3 minutes. My kids watch cartoons, my wife watches Turkish dramas, I watch sports — all at the same time. Perfect family plan."',
  t3n: 'Omar B.', t3t: 'Family Plan User',
  signIn: 'Sign In', emailUs: 'Email Us', liveChat: 'Live Chat',
  helpCenter: 'Help Center', terms: 'Terms of Service', privacy: 'Privacy Policy', refund: 'Refund Policy',
  rights: 'All rights reserved.',
}

const LUX_FR = {
  badge: '✧ LUXSTREAM IPTV Premium',
  heroTitle: 'Le Cinéma à la Maison.<br />Toutes les Chaînes. Tous les Moments.',
  heroDesc: 'Sports en direct, films à succès et séries tendance — tout en qualité 4K HDR. Un abonnement, divertissement infini.',
  watchNow: '▶ Regarder Maintenant',
  freeTrial: '✦ Essai Gratuit',
  liveTv: 'TV en Direct', movies: 'Films', series: 'Séries', sports: 'Sports',
  worldCup: 'Coupe du Monde FIFA 2026',
  worldCupSub: 'Tous les matchs en direct en 4K HDR — Phase de Groupes jusqu\'à la Finale',
  moviesOnDemand: 'Films à la Demande',
  moviesSub: '10 000+ blockbusters de Hollywood à Bollywood',
  trendingSeries: 'Séries Tendance',
  seriesSub: 'Saisons complètes des séries les plus regardées, nouveaux épisodes chaque jour',
  liveSports: 'Sports en Direct',
  sportsSub: 'Premier League, NBA, UFC et 25 000+ chaînes',
  features: 'Fonctionnalités', plans: 'Offres', faq: 'FAQ',
  pricingTitle: 'Choisissez Votre Offre',
  pricingSub: 'Toutes les offres incluent le streaming 4K, support multi-appareils et assistance 24/7.',
  monthly: 'Mensuel', yearly: 'Annuel', save: 'Économisez 20%',
  mostPopular: 'Le Plus Populaire',
  getStarted: 'Commencer', subscribe: "S'abonner",
  testimonials: 'Témoignages', testimonialsTitle: 'Ce que disent nos spectateurs',
  testimonialsSub: 'Rejoignez des milliers de clients satisfaits.',
  faqTitle: 'Questions Fréquentes',
  ctaTitle: 'Prêt pour la Meilleure Expérience IPTV ?',
  ctaDesc: 'Commencez votre essai gratuit aujourd\'hui. Aucune carte bancaire requise.',
  startFree: '✦ Essai Gratuit',
  footerDesc: 'LuxStream IPTV Premium — 25 000+ chaînes, qualité 4K, activation instantanée dans le monde entier.',
  quickLinks: 'Liens Rapides', support: 'Support', legal: 'Légal',
  channels: 'Chaînes', devices: 'Appareils', uptime: 'Disponibilité', streams: 'Flux',
  allDevices: 'Tous les Appareils', zeroBuffer: 'Zéro Buffering', hd4k: 'HD & 4K HDR', support24: 'Assistance 24/7',
  worldCupTitle: 'Coupe du Monde FIFA 2026',
  worldCupDesc: 'Les 64 matchs en direct en 4K HDR. Phase de groupes, éliminatoires et finale.',
  moviesTitle: '10 000+ Films à la Demande',
  moviesDesc: 'Blockbusters Hollywood, cinéma français, films arabes et bollywoodiens. Nouveaux titres chaque semaine.',
  seriesTitle: '5 000+ Séries TV',
  seriesDesc: 'Saisons complètes des séries tendance, originals de style Netflix, classiques. Prêt pour le binge-watching.',
  sportsTitle: 'Sports en Direct 24/7',
  sportsDesc: 'Premier League, Ligue des Champions, NBA, NFL, UFC, F1 — chaque grand événement sportif, en direct.',
  q1: 'Qu\'est-ce que LuxStream ?', q2: 'Quelle est la rapidité de configuration ?', q3: 'Puis-je regarder la Coupe du Monde ?', q4: 'Quels appareils fonctionnent ?', q5: 'Y a-t-il un essai gratuit ?',
  a1: 'LuxStream est un service IPTV premium offrant 25 000+ chaînes TV en direct, 10 000+ films et 5 000+ séries en qualité 4K HDR via internet. Compatible avec Smart TV, Firestick, Android, iOS et plus.',
  a2: 'La configuration prend moins de 5 minutes. Choisissez votre offre, recevez vos identifiants par email, entrez-les dans n\'importe quelle app IPTV (TiviMate, IPTV Smarters, GSE, etc.) et commencez à regarder.',
  a3: 'Oui ! Les 64 matchs de la Coupe du Monde FIFA 2026 sont diffusés en direct en 4K HDR. Notre package sportif inclut chaque grande ligue — Premier League, Liga, Serie A, Champions League, NBA, NFL et plus.',
  a4: 'Smart TV (Samsung, LG, Sony), Amazon Firestick, Android TV, téléphones/tablettes Android, iOS/Apple TV, boxes MAG, et tout appareil supportant les apps IPTV comme TiviMate, IPTV Smarters ou GSE.',
  a5: 'Oui ! Cliquez sur le chat pour réclamer votre essai gratuit — aucune carte bancaire requise. Testez les 25 000+ chaînes sans risque pendant 72 heures.',
  t1: '"Enfin résilié le câble. La Coupe du Monde en 4K était absolument incroyable. Meilleur service IPTV que j\'ai utilisé."',
  t1n: 'Ahmed K.', t1t: 'Fan de Sport',
  t2: '"La bibliothèque de films est immense — Hollywood, arabe, Bollywood, tout. Et tout streaming en 4K parfaite sur ma Smart TV."',
  t2n: 'Sarah M.', t2t: 'Amatrice de Films',
  t3: '"Configuration en 3 minutes. Mes enfants regardent des dessins, ma femme regarde des séries turques, je regarde le sport — tous en même temps. Parfait."',
  t3n: 'Omar B.', t3t: 'Plan Familial',
  signIn: 'Connexion', emailUs: 'Nous Écrire', liveChat: 'Chat en Direct',
  helpCenter: "Centre d'Aide", terms: "Conditions d'Utilisation", privacy: 'Politique de Confidentialité', refund: 'Politique de Remboursement',
  rights: 'Tous droits réservés.',
  premiumContent: 'Contenu Premium',
  everythingWatch: 'Tout ce que Vous Voulez Regarder',
  everythingDesc: "Des sports en direct aux films à succès — LuxStream offre l'expérience de divertissement ultime.",
  watchFreeTrial: 'Regarder Essai Gratuit',
  channelsLabel: 'Chaînes',
  qualityLabel: 'Qualité',
  bufferingLabel: 'Zéro Buffering',
  setupLabel: 'Installation',
  secureLabel: 'Sécurisé & Privé',
  marqueeWorldCup: '⚽ Coupe du Monde FIFA 2026 — 64 Matchs en Direct en 4K',
  marqueeMovies: '🎬 10 000+ Films à la Demande',
  marqueeSeries: '📺 5 000+ Séries TV — Saisons Complètes',
  marqueePremier: '🔥 Premier League — Tous les Matchs en Direct',
  marqueeSports: '🎯 NBA, NFL, UFC — Tous les Sports 24/7',
  marqueeSetup: '⚡ Installation Instantanée — Moins de 5 Minutes',
  marqueeChannels: '🌍 25 000+ Chaînes — Couverture Mondiale',
  worldCupLive: 'FIFA 2026 — Les 64 Matchs en Direct',
  groupStage: '🏆 Phase de Groupes',
  knockout: '⚡ Éliminatoires',
  final: '🎯 Finale',
  allIn4k: '📺 Tout en 4K HDR',
  tagMatches: '64 Matchs', tagHdr: '4K HDR', tagLang: 'Toutes Langues', tagReplay: 'Rediffusion',
  tagNetflix: 'Style Netflix', tagSeasons: 'Saisons Complètes', tagDaily: 'Mises à Jour', tagHd: 'HD',
  badgeLive: 'DIRECT 2026', badgeHot: '🔥 TENDANCE', badgeVod: 'VOD', badgeSeries: 'SÉRIES', badgeLiveInd: 'DIRECT',
  featChannels: '25 000+ Chaînes', featChannelsDesc: 'Tous les pays, toutes catégories',
  trialHeading: "Hey ! Configurons votre essai gratuit.",
  trialDesc: 'Remplissez vos informations ci-dessous et nous vous enverrons vos identifiants immédiatement.',
  nameLabel: 'Votre Nom (facultatif)', namePlaceholder: 'Jean Dupont',
  emailLabel: 'Adresse Email *', emailPlaceholder: 'jean@exemple.com',
  whatsappLabel: 'WhatsApp (facultatif)', whatsappPlaceholder: '+212612345678',
  providerLabel: 'Choisissez le Fournisseur *', selectProvider: 'Sélectionnez un fournisseur',
  sendingTrial: 'Envoi de votre essai...', getTrial: '🎁 Obtenir Mon Essai Gratuit',
  trialReady: 'Votre essai est prêt !', sentTo: 'Nous avons envoyé vos identifiants à :',
  provider: 'Fournisseur :', duration: 'Durée :', hours: 'heures',
  upgrade: '💳 Passer à un Forfait Complet', close: 'Fermer',
  trialFailed: 'Échec de la demande d\'essai', networkError: 'Erreur réseau. Veuillez réessayer.',
  featQuality: 'Qualité 4K HDR', featQualityDesc: 'Streaming cristallin',
  featBuffer: 'Zéro Buffering', featBufferDesc: '99.9% disponibilité garantie',
  featDevices: 'Tous les Appareils', featDevicesDesc: 'Smart TV, Firestick, Mobile',
  featSupport: 'Assistance 24/7', featSupportDesc: 'Vrais humains, réponses rapides',
  featSecure: 'Sécurisé & Privé', featSecureDesc: 'Pas de logs, chiffré',
}

function FadeSection({ children, delay = 0 }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { setTimeout(() => e.target.classList.add('visible'), delay); observer.unobserve(e.target) } })
    }, { threshold: 0.1 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [delay])
  return <div ref={ref} className="fade-up">{children}</div>
}

export default function LuxStreamLanding() {
  const [plans, setPlans] = useState([])
  const [openFaq, setOpenFaq] = useState(null)
  const [checkoutPlan, setCheckoutPlan] = useState(null)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [modal, setModal] = useState(null)
  const [user, setUser] = useState(null)
  const [events, setEvents] = useState(null)
  const [subscriptions, setSubscriptions] = useState([])
  const [showAuth, setShowAuth] = useState(false)
  const [settings, setSettings] = useState(null)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [showTrialModal, setShowTrialModal] = useState(false)
  const [trialForm, setTrialForm] = useState({ name: '', email: '', phone: '', providerId: '', preferredApp: 'tivimate' })

  const APPS_LIST = [
    { id: 'tivimate', icon: '🔥', name: 'TiviMate', desc: 'Firestick / Android TV' },
    { id: 'smarters', icon: '📱', name: 'IPTV Smarters', desc: 'Android / iOS' },
    { id: 'gse', icon: '🍎', name: 'GSE Smart IPTV', desc: 'iPhone / Apple TV' },
    { id: 'vlc', icon: '💻', name: 'VLC / M3U', desc: 'PC / Mac / Universal' },
    { id: 'mag', icon: '📦', name: 'MAG Box', desc: 'Set-top box' },
    { id: 'enigma', icon: '🛜', name: 'Enigma2', desc: 'Dreambox / VU+' },
    { id: 'formuler', icon: '📺', name: 'Formuler', desc: 'MyTVOnline' },
    { id: 'iptvx', icon: '📱', name: 'IPTVX', desc: 'iPhone / iPad' },
  ]
  const [trialProviders, setTrialProviders] = useState([])
  const [trialSubmitting, setTrialSubmitting] = useState(false)
  const [trialSuccess, setTrialSuccess] = useState(null)

  const ws = typeof window !== 'undefined' && window.__WEBSITE__
  const siteName = ws?.site_name || ws?.name || 'LuxStream'
  const logoUrl = ws?.logo_url || ''
  const lang = ws?.language || 'en'
  const t = (key) => lang === 'fr' ? (LUX_FR[key] || key) : (LUX_EN[key] || key)

  useEffect(() => {
    fetch('/api/checkout/settings').then(r => r.json()).then(setSettings).catch(() => {})
    const token = localStorage.getItem('user_token')
    if (token) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(data => {
          if (data.user) { setUser(data.user); setSubscriptions(data.subscriptions || []) }
          else localStorage.removeItem('user_token')
        }).catch(() => { localStorage.removeItem('user_token') })
    }
    fetch('/api/hero/events').then(r => r.json()).then(setEvents).catch(() => {})
    api.get('/plans').then(r => {
      const all = r.data
      const used = new Set()
      const deduped = []
      for (const p of all) {
        const key = `${p.plan_name}-${p.price_sell}`
        if (!used.has(key)) { used.add(key); deduped.push(p) }
      }
      setPlans(deduped)
    }).catch(() => {})
    function check() { setIsMobile(window.innerWidth < 768) }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  function handleAuth(userData, token) {
    setUser(userData)
    setShowAuth(false)
  }

  function handleSignOut() {
    localStorage.removeItem('user_token')
    setUser(null)
    setSubscriptions([])
  }

  function getSessionId() {
    let id = localStorage.getItem('chat_session_id')
    if (!id) {
      id = 'ls_' + Math.random().toString(36).slice(2, 10)
      localStorage.setItem('chat_session_id', id)
    }
    return id
  }

  function openTrialModal() {
    setShowTrialModal(true)
    setTrialSuccess(null)
    setTrialForm({ name: '', email: '', phone: '', providerId: '', preferredApp: 'tivimate' })
    fetch('/api/providers/active').then(r => r.json()).then(setTrialProviders).catch(() => {})
  }

  async function handleTrialSubmit(e) {
    e.preventDefault()
    const { name, email, phone, providerId, preferredApp } = trialForm
    if (!email || !providerId) return
    setTrialSubmitting(true)
    try {
      const res = await fetch('/api/trial/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, providerId: parseInt(providerId), preferredApp, sessionId: getSessionId() }),
      })
      const data = await res.json()
      if (data.success) {
        setTrialSuccess(data)
      } else {
        alert(data.error || t('trialFailed'))
      }
    } catch {
      alert(t('networkError'))
    } finally {
      setTrialSubmitting(false)
    }
  }
  const getPlanPrice = (p) => (p.price_sell || 0).toFixed(2)

  const getPlanLabel = (p) => {
    const months = p.duration_months || Math.round((p.duration_days || 30) / 30)
    if (months >= 12) return '/an'
    if (months <= 1) return ''
    return `/${months}mois`
  }
  const navLinks = [
    { label: t('features'), href: '#features', page: false },
    { label: t('plans'), href: '#plans', page: false },
    { label: 'Blog', href: '/blog', page: true },
    { label: t('faq'), href: '#faq', page: false },
    { label: 'Support', href: '/support', page: true },
    { label: 'Téléchargements', href: '/downloads', page: true },
  ]

  return (
    <div style={{ background: '#050510', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif', minHeight: '100vh' }}>
      <style>{`
        .fade-up { opacity: 0; transform: translateY(30px); transition: all 0.6s ease-out; }
        .fade-up.visible { opacity: 1; transform: translateY(0); }
        @keyframes pulse-glow { 0%,100% { box-shadow: 0 0 20px #ff6b3522; } 50% { box-shadow: 0 0 40px #ff6b3544; } }
        @keyframes grid-drift { 0% { transform: translate(0,0); } 100% { transform: translate(80px,80px); } }
        @keyframes channelScroll { 0% { transform: translateY(0); } 25% { transform: translateY(-64px); } 50% { transform: translateY(-128px); } 75% { transform: translateY(-64px); } 100% { transform: translateY(0); } }
        @keyframes remotePress { 0%,100% { transform: translateY(0); } 12.5%,37.5%,62.5%,87.5% { transform: translateY(2px) scale(0.95); } }
        @keyframes screenGlow { 0%,100% { box-shadow: 0 0 30px #ff6b3522, inset 0 0 60px #00000080; } 50% { box-shadow: 0 0 50px #ff6b3544, inset 0 0 60px #00000080; } }
        @keyframes liveDot { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes handHold { 0%,100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
        @keyframes orb-float { 0%,100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(20px, -20px) scale(1.05); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes banner-slide { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .hero-orb { animation: orb-float 8s ease-in-out infinite; }
        .content-card:hover .card-img { transform: scale(1.05); }
        .card-img { transition: transform 0.5s ease; }
        .stream-badge { animation: pulse-glow 3s ease-in-out infinite; }
        .live-indicator { animation: pulse-glow 2s ease-in-out infinite; }
        .marquee-banner { animation: banner-slide 30s linear infinite; }
        .gold-text { background: linear-gradient(135deg, #ffd700, #ff8c00, #ffd700); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .cyan-text { background: linear-gradient(135deg, #00f0ff, #00c4cc, #00f0ff); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1a1a2e; border-radius: 3px; }
      `}</style>

      {/* Marquee Banner */}
      <div style={{ background: 'linear-gradient(90deg, #ff6b35, #ff2d92, #ff6b35)', padding: '8px 0', overflow: 'hidden', borderBottom: '1px solid #ffffff10' }}>
        <div style={{ display: 'flex', whiteSpace: 'nowrap', animation: 'banner-slide 30s linear infinite' }}>
                      {Array(3).fill([t('marqueeWorldCup'), t('marqueeMovies'), t('marqueeSeries'), t('marqueePremier'), t('marqueeSports'), t('marqueeSetup'), t('marqueeChannels')]).map((items, i) =>
            items.map((item, j) => (
              <span key={`${i}-${j}`} style={{ padding: '0 40px', fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '0.5px' }}>{item}</span>
            ))
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ position: 'sticky', top: 0, background: '#050510ee', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid #ffffff10', zIndex: 100, padding: '0 20px' }}>
        <div style={{ maxWidth: 1300, margin: '0 auto', display: 'flex', alignItems: 'center', height: 68, gap: 32 }}>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
            <span style={{ background: 'linear-gradient(135deg, #ff6b35, #ff2d92)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: 28 }}>LUX</span>
            <span style={{ color: '#fff' }}>STREAM</span>
          </div>
          {!isMobile && (
            <div style={{ display: 'flex', gap: 20, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              {navLinks.map(l => l.page ? (
                <a key={l.label} onClick={() => window.location.href = l.href} style={{
                  color: '#8888aa', textDecoration: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.2s', padding: '4px 0',
                  borderBottom: '2px solid transparent',
                }}
                  onMouseEnter={e => { e.target.style.color = '#fff'; e.target.style.borderBottomColor = '#ff6b3566' }}
                  onMouseLeave={e => { e.target.style.color = '#8888aa'; e.target.style.borderBottomColor = 'transparent' }}>
                  {l.label}
                </a>
              ) : (
                <a key={l.label} href={l.href} onClick={e => { e.preventDefault(); document.querySelector(l.href)?.scrollIntoView({ behavior: 'smooth' }) }}
                  style={{ color: '#8888aa', textDecoration: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.2s', padding: '4px 0',
                    borderBottom: '2px solid transparent' }}
                  onMouseEnter={e => { e.target.style.color = '#fff'; e.target.style.borderBottomColor = '#00d4ff66' }}
                  onMouseLeave={e => { e.target.style.color = '#8888aa'; e.target.style.borderBottomColor = 'transparent' }}>
                  {l.label}
                </a>
              ))}
              <span style={{ width: 1, height: 20, background: '#ffffff10', margin: '0 4px' }} />
            </div>
          )}
          {!isMobile && (
            <>
              {user ? (
                <UserMenu user={user} subscriptions={subscriptions} onSignOut={handleSignOut} />
              ) : (
                <button onClick={() => { if (localStorage.getItem('customer_token')) { window.location.href = '/dashboard' } else { setShowAuth(true) } }} style={{ padding: '8px 18px', background: 'transparent', color: '#fff', border: '1px solid #ffffff22', borderRadius: 50, fontWeight: 600, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}>
                  {localStorage.getItem('customer_token') ? '📊 Dashboard' : t('signIn')}
                </button>
              )}
              <button onClick={() => openTrialModal()} style={{ padding: '9px 24px', background: 'linear-gradient(135deg, #ff6b35, #ff2d92)', color: '#fff', border: 'none', borderRadius: 50, fontWeight: 700, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap', boxShadow: '0 4px 20px #ff6b3533', transition: 'all 0.3s' }}
                onMouseEnter={e => { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 6px 30px #ff6b3544' }}
                onMouseLeave={e => { e.target.style.transform = ''; e.target.style.boxShadow = '0 4px 20px #ff6b3533' }}>
                {t('freeTrial')}
              </button>
            </>
          )}
          <button onClick={() => setMobileMenu(!mobileMenu)} style={{ display: isMobile ? 'block' : 'none', background: 'transparent', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', padding: 8, marginLeft: 'auto' }}>
            {mobileMenu ? '✕' : '☰'}
          </button>
        </div>
        {mobileMenu && isMobile && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 0', borderTop: '1px solid #ffffff10', animation: 'fadeIn 0.2s' }}>
            {navLinks.map(l => l.page ? (
              <a key={l.label} onClick={() => { setMobileMenu(false); window.location.href = l.href }}
                style={{ color: '#8888aa', textDecoration: 'none', fontSize: 14, fontWeight: 600, padding: '8px 0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#ff6b35' }}>▸</span> {l.label}
              </a>
            ) : (
              <a key={l.label} href={l.href} onClick={e => { e.preventDefault(); document.querySelector(l.href)?.scrollIntoView({ behavior: 'smooth' }); setMobileMenu(false) }}
                style={{ color: '#8888aa', textDecoration: 'none', fontSize: 14, fontWeight: 600, padding: '8px 0', cursor: 'pointer' }}>{l.label}</a>
            ))}
            <div style={{ height: 1, background: '#ffffff10', margin: '4px 0' }} />
            <button onClick={() => { setMobileMenu(false); openTrialModal() }} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #ff6b35, #ff2d92)', color: '#fff', border: 'none', borderRadius: 50, fontWeight: 700, cursor: 'pointer', fontSize: 13, textAlign: 'center', marginTop: 4 }}>
              {t('freeTrial')}
            </button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden', padding: '60px 24px' }}>
        <div style={{ position: 'absolute', inset: 0, background: "radial-gradient(ellipse at 20% 50%, #ff6b3520 0%, transparent 50%), radial-gradient(ellipse at 80% 50%, #ff2d9220 0%, transparent 50%), radial-gradient(ellipse at 50% 0%, #ff6b3510 0%, transparent 40%)", zIndex: 0 }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(#ff6b3515 1px, transparent 1px)', backgroundSize: '40px 40px', zIndex: 0, maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)', WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)' }} />
        <div style={{ position: 'absolute', top: '20%', left: '15%', width: 200, height: 200, background: 'radial-gradient(circle, #ff6b3525, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)', zIndex: 0 }} className="hero-orb" />
        <div style={{ position: 'absolute', bottom: '20%', right: '15%', width: 250, height: 250, background: 'radial-gradient(circle, #ff2d9225, transparent 70%)', borderRadius: '50%', filter: 'blur(50px)', zIndex: 0 }} className="hero-orb" />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 60, alignItems: 'center', maxWidth: 1300, margin: '0 auto', width: '100%', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ flex: '1 1 500px', maxWidth: 560 }}>
            <div style={{ display: 'inline-block', padding: '6px 20px', borderRadius: 20, background: 'linear-gradient(135deg, #ff6b3520, #ff2d9220)', border: '1px solid #ff6b3544', color: '#ff6b35', fontSize: 13, fontWeight: 700, marginBottom: 28, letterSpacing: '1px' }}>{t('badge')}</div>
            <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)', fontWeight: 900, lineHeight: 1.05, marginBottom: 24, background: 'linear-gradient(135deg, #fff 20%, #ff6b35 60%, #ff2d92 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              <span dangerouslySetInnerHTML={{ __html: t('heroTitle') }} />
            </h1>
            <p style={{ fontSize: 'clamp(0.95rem, 1.6vw, 1.15rem)', color: '#8888aa', maxWidth: 520, lineHeight: 1.8, marginBottom: 32 }}>
              {t('heroDesc')}
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <button onClick={() => document.querySelector('#plans')?.scrollIntoView({ behavior: 'smooth' })}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '13px 32px', background: 'linear-gradient(135deg, #ff6b35, #ff2d92)', color: '#fff', borderRadius: 50, fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer', transition: 'all 0.3s', boxShadow: '0 4px 30px #ff6b3544' }}
                onMouseEnter={e => { e.target.style.transform = 'translateY(-3px) scale(1.02)'; e.target.style.boxShadow = '0 8px 40px #ff6b3566' }}
                onMouseLeave={e => { e.target.style.transform = ''; e.target.style.boxShadow = '0 4px 30px #ff6b3544' }}>
                ▶ {t('watchNow')}
              </button>
              <button onClick={() => openTrialModal()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 32px', background: 'transparent', color: '#fff', borderRadius: 50, fontWeight: 700, fontSize: 14, border: '1.5px solid #ffffff22', cursor: 'pointer', transition: 'all 0.3s' }}
                onMouseEnter={e => { e.target.style.borderColor = '#ff6b3566'; e.target.style.color = '#ff6b35' }}
                onMouseLeave={e => { e.target.style.borderColor = '#ffffff22'; e.target.style.color = '#fff' }}>
                ✦ {t('freeTrial')}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 24, marginTop: 36 }}>
              {[{ num: '25K+', lbl: t('channels'), color: '#ff6b35' }, { num: '4K HDR', lbl: t('qualityLabel'), color: '#ff2d92' }, { num: '99.9%', lbl: t('uptime'), color: '#ff6b35' }].map(s => (
                <div key={s.lbl}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.num}</div>
                  <div style={{ fontSize: 12, color: '#6666aa', marginTop: 2 }}>{s.lbl}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: '0 0 auto', position: 'relative' }}>
            <div style={{
              width: 300, height: 520, borderRadius: 32,
              background: '#111', border: '3px solid #333',
              boxShadow: '0 20px 80px rgba(0,0,0,0.6), 0 0 60px #ff6b3515',
              position: 'relative', overflow: 'hidden',
              animation: 'screenGlow 10s ease-in-out infinite',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 44, background: '#0a0a0a', zIndex: 10, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8, borderBottom: '1px solid #222' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff6b35', animation: 'liveDot 1.5s infinite' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#ff6b35' }}>ATLAS PRO</span>
                <span style={{ fontSize: 10, color: '#555', marginLeft: 'auto' }}>Live TV</span>
                <div style={{ display: 'flex', gap: 2 }}>
                  {['●','●','●'].map((d,i) => <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: i === 0 ? '#ff4444' : i === 1 ? '#ffd700' : '#00cc66' }} />)}
                </div>
              </div>
              <div style={{ position: 'absolute', top: 44, left: 0, right: 0, bottom: 48, background: '#0a0a0a', overflow: 'hidden' }}>
                <div style={{ animation: 'channelScroll 10s ease-in-out infinite', position: 'absolute', left: 0, right: 0 }}>
                  {(events?.sports?.length > 0 ? events.sports.slice(0, 4) : []).map((ev, i) => {
                    const colors = [
                      { bg: '#1a3a1a, #0a1a0a', accent: '#ff6b35', icon: '⚽' },
                      { bg: '#1a1a3a, #0a0a1a', accent: '#7b2dff', icon: '🎬' },
                      { bg: '#1a3a2a, #0a1a10', accent: '#00ff88', icon: '📺' },
                      { bg: '#3a1a1a, #1a0a0a', accent: '#ff4444', icon: '🏀' },
                    ]
                    const c = colors[i % 4]
                    return (
                      <div key={i} style={{ height: 128, padding: 16, background: `linear-gradient(135deg, ${c.bg})`, borderBottom: '1px solid #222' }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ width: 44, height: 44, borderRadius: 10, background: `linear-gradient(135deg, ${c.accent}, ${c.accent}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{c.icon}</div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{ev.channel || 'Live'}</div>
                            <div style={{ fontSize: 11, color: c.accent, fontWeight: 600 }}>{ev.type === 'movie' ? '🎥 4K UHD' : '🔴 EN DIRECT'}</div>
                          </div>
                          {ev.start_time && <div style={{ marginLeft: 'auto', fontSize: 12, color: '#888' }}>{ev.start_time}</div>}
                        </div>
                        <div style={{ fontSize: 12, color: '#aaa', lineHeight: 1.5 }}>
                          {ev.title}{ev.stop_time ? ` • jusqu'à ${ev.stop_time}` : ''}
                        </div>
                        <div style={{ marginTop: 6, height: 3, background: '#222', borderRadius: 2, overflow: 'hidden' }}>
                          {ev.type !== 'movie' && <div style={{ width: `${50 + Math.random() * 40}%`, height: '100%', background: c.accent, borderRadius: 2, animation: 'pulse-soft 2s infinite' }} />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 48, background: '#0a0a0a', zIndex: 10, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 4, borderTop: '1px solid #222', justifyContent: 'center' }}>
                {['⬅','📺','🏠','⬆','➡'].map((icon,i) => (
                  <div key={i} style={{ width: 32, height: 28, borderRadius: 4, background: '#1a1a1a', color: '#666', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #2a2a2a' }}>{icon}</div>
                ))}
                <div style={{ width: 44, height: 28, borderRadius: 6, background: 'linear-gradient(135deg, #ff6b35, #ff2d92)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', margin: '0 4px' }}>OK</div>
                {['⬇','📋','🔙','📶'].map((icon,i) => (
                  <div key={i} style={{ width: 32, height: 28, borderRadius: 4, background: '#1a1a1a', color: '#666', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #2a2a2a' }}>{icon}</div>
                ))}
              </div>
              <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 4px)', pointerEvents: 'none', zIndex: 5 }} />
            </div>
            <div style={{
              position: 'absolute', right: -80, top: '50%', transform: 'translateY(-50%)',
              animation: 'handHold 3s ease-in-out infinite',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
            }}>
              <div style={{ fontSize: 48, lineHeight: 1, filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.4))' }}>🖐️</div>
              <div style={{
                width: 42, height: 130, borderRadius: 12, background: 'linear-gradient(180deg, #1a1a1a, #0d0d0d)',
                border: '1px solid #333', boxShadow: '0 8px 30px rgba(0,0,0,0.5), inset 0 1px 0 #ffffff15',
                display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0', gap: 6,
                animation: 'remotePress 10s ease-in-out infinite',
              }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#ff4444', animation: 'liveDot 2s infinite', boxShadow: '0 0 8px #ff4444' }} />
                <div style={{ width: 28, height: 4, borderRadius: 2, background: '#333' }} />
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, #2a2a2a, #1a1a1a)', border: '1px solid #444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#888' }}>◉</div>
                <div style={{ width: 28, height: 4, borderRadius: 2, background: '#333' }} />
                <div style={{ width: 22, height: 10, borderRadius: 3, background: '#2a2a2a', border: '1px solid #444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, color: '#666' }}>CH</div>
                <div style={{ width: 28, height: 4, borderRadius: 2, background: '#333' }} />
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'linear-gradient(135deg, #ff6b35, #ff2d92)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, color: '#fff', fontWeight: 700 }}>OK</div>
                <div style={{ width: 28, height: 4, borderRadius: 2, background: '#333' }} />
                <div style={{ fontSize: 8, color: '#555', letterSpacing: 1 }}>VOL</div>
                <div style={{ width: 22, height: 10, borderRadius: 3, background: '#2a2a2a', border: '1px solid #444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 7, color: '#666' }}>＋</span>
                </div>
                <div style={{ width: 22, height: 10, borderRadius: 3, background: '#2a2a2a', border: '1px solid #444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 7, color: '#666' }}>－</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* World Cup Hero Banner */}
      <section style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #1a0a0a, #0f0a1a)', borderTop: '1px solid #ff6b3522', borderBottom: '1px solid #ff6b3522' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 40, flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: 'linear-gradient(135deg, #ff6b35, #ff2d92)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>⚽</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 2 }}>{t('worldCup')}</div>
              <div style={{ fontSize: 13, color: '#8888aa' }}>{t('worldCupLive')}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[t('groupStage'), t('knockout'), t('final'), t('allIn4k')].map(l => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ff6b35', fontSize: 13, fontWeight: 700 }}>
                <span style={{ fontSize: 16 }}>✓</span> {l}
              </div>
            ))}
          </div>
          <button onClick={() => openTrialModal()} style={{ padding: '10px 28px', background: 'linear-gradient(135deg, #ff6b35, #ff2d92)', color: '#fff', border: 'none', borderRadius: 50, fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 20px #ff6b3544' }}>
            {t('watchFreeTrial')} ⚽
          </button>
        </div>
      </section>

      {/* Content Categories */}
      <section id="features" style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1300, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <span style={{ display: 'inline-block', padding: '4px 16px', borderRadius: 20, background: '#ff6b3515', color: '#ff6b35', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 16 }}>{t('premiumContent')}</span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 3rem)', fontWeight: 900, marginBottom: 12 }}>{t('everythingWatch')}</h2>
            <p style={{ color: '#6666aa', fontSize: 16, maxWidth: 550, margin: '0 auto' }}>{t('everythingDesc')}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {/* World Cup Card */}
            <FadeSection delay={0}>
              <div className="content-card" style={{ background: 'linear-gradient(145deg, #1a0808, #0f0508)', border: '1px solid #ff6b3533', borderRadius: 20, overflow: 'hidden', transition: 'all 0.4s', cursor: 'pointer', position: 'relative' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.boxShadow = '0 20px 60px #ff6b3522' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
                <div style={{ height: 180, background: 'linear-gradient(135deg, #ff6b3520, #ff2d9215)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, position: 'relative', overflow: 'hidden' }}>
                  <div className="card-img" style={{ fontSize: 72 }}>⚽</div>
                  <div style={{ position: 'absolute', top: 12, left: 12, background: '#ff6b35', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800 }}>{t('badgeLive')}</div>
                  <div style={{ position: 'absolute', top: 12, right: 12, background: '#ff2d92', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800 }}>{t('badgeHot')}</div>
                </div>
                <div style={{ padding: '24px 20px' }}>
                  <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: '#fff' }}>{t('worldCupTitle')}</h3>
                  <p style={{ color: '#8888aa', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>{t('worldCupDesc')}</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[t('tagMatches'), t('tagHdr'), t('tagLang'), t('tagReplay')].map(tag => (
                      <span key={tag} style={{ background: '#ff6b3515', color: '#ff6b35', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </FadeSection>

            {/* Movies Card */}
            <FadeSection delay={100}>
              <div className="content-card" style={{ background: 'linear-gradient(145deg, #0a0a18, #0f0f25)', border: '1px solid #7b2dff33', borderRadius: 20, overflow: 'hidden', transition: 'all 0.4s', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.boxShadow = '0 20px 60px #7b2dff22' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
                <div style={{ height: 180, background: 'linear-gradient(135deg, #7b2dff20, #00f0ff15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, position: 'relative', overflow: 'hidden' }}>
                  <div className="card-img" style={{ fontSize: 72 }}>🎬</div>
                  <div style={{ position: 'absolute', top: 12, left: 12, background: '#7b2dff', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800 }}>{t('badgeVod')}</div>
                </div>
                <div style={{ padding: '24px 20px' }}>
                  <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: '#fff' }}>{t('moviesTitle')}</h3>
                  <p style={{ color: '#8888aa', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>{t('moviesDesc')}</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['Hollywood', 'Arabic', 'Bollywood', '4K'].map(tag => (
                      <span key={tag} style={{ background: '#7b2dff15', color: '#7b2dff', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{tag === '4K' ? '4K' : tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </FadeSection>

            {/* Series Card */}
            <FadeSection delay={200}>
              <div className="content-card" style={{ background: 'linear-gradient(145deg, #0a0a12, #0f1a1a)', border: '1px solid #00f0ff33', borderRadius: 20, overflow: 'hidden', transition: 'all 0.4s', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.boxShadow = '0 20px 60px #00f0ff22' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
                <div style={{ height: 180, background: 'linear-gradient(135deg, #00f0ff20, #00ff8815)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, position: 'relative', overflow: 'hidden' }}>
                  <div className="card-img" style={{ fontSize: 72 }}>📺</div>
                  <div style={{ position: 'absolute', top: 12, left: 12, background: '#00f0ff', color: '#000', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800 }}>{t('badgeSeries')}</div>
                </div>
                <div style={{ padding: '24px 20px' }}>
                  <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: '#fff' }}>{t('seriesTitle')}</h3>
                  <p style={{ color: '#8888aa', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>{t('seriesDesc')}</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[t('tagNetflix'), t('tagSeasons'), t('tagDaily'), t('tagHd')].map(tag => (
                      <span key={tag} style={{ background: '#00f0ff15', color: '#00f0ff', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </FadeSection>

            {/* Sports Card */}
            <FadeSection delay={300}>
              <div className="content-card" style={{ background: 'linear-gradient(145deg, #0a120a, #0f1a0a)', border: '1px solid #00ff8833', borderRadius: 20, overflow: 'hidden', transition: 'all 0.4s', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.boxShadow = '0 20px 60px #00ff8822' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
                <div style={{ height: 180, background: 'linear-gradient(135deg, #00ff8820, #ffaa0015)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, position: 'relative', overflow: 'hidden' }}>
                  <div className="card-img" style={{ fontSize: 72 }}>🏆</div>
                  <div className="live-indicator" style={{ position: 'absolute', top: 12, left: 12, background: '#00ff88', color: '#000', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#000' }} />{t('badgeLiveInd')}
                  </div>
                </div>
                <div style={{ padding: '24px 20px' }}>
                  <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: '#fff' }}>{t('sportsTitle')}</h3>
                  <p style={{ color: '#8888aa', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>{t('sportsDesc')}</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['Premier League', 'NBA', 'UFC', 'F1'].map(tag => (
                      <span key={tag} style={{ background: '#00ff8815', color: '#00ff88', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </FadeSection>
          </div>
        </div>
      </section>

      {/* Features Strip */}
      <section style={{ padding: '40px 24px', background: 'linear-gradient(180deg, #050510, #0a0a15)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            {[
              { icon: '📺', title: t('featChannels'), desc: t('featChannelsDesc'), color: '#ff6b35' },
              { icon: '🎯', title: t('featQuality'), desc: t('featQualityDesc'), color: '#ff2d92' },
              { icon: '⚡', title: t('featBuffer'), desc: t('featBufferDesc'), color: '#00f0ff' },
              { icon: '📱', title: t('featDevices'), desc: t('featDevicesDesc'), color: '#00ff88' },
              { icon: '🎧', title: t('featSupport'), desc: t('featSupportDesc'), color: '#ffd700' },
              { icon: '🔒', title: t('featSecure'), desc: t('featSecureDesc'), color: '#7b2dff' },
            ].map((f, i) => (
              <FadeSection key={f.title} delay={i * 50}>
                <div style={{ textAlign: 'center', padding: '24px 16px', background: '#ffffff06', border: '1px solid #ffffff10', borderRadius: 16, transition: 'all 0.3s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#ffffff10'; e.currentTarget.style.transform = 'translateY(-4px)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#ffffff06'; e.currentTarget.style.transform = '' }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>{f.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: '#6666aa' }}>{f.desc}</div>
                </div>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section id="plans" style={{ padding: '80px 24px', background: 'linear-gradient(180deg, #0a0a15, #050510)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span style={{ display: 'inline-block', padding: '4px 16px', borderRadius: 20, background: '#ff6b3515', color: '#ff6b35', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>{t('pricing')}</span>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.5rem)', fontWeight: 900, marginBottom: 12 }}>{t('pricingTitle')}</h2>
            <p style={{ color: '#6666aa', fontSize: 15, maxWidth: 550, margin: '0 auto' }}>{t('pricingSub')}</p>
          </div>

          <div style={{ marginBottom: 40 }}></div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 24, maxWidth: 1000, margin: '0 auto' }}>
            {plans.filter(p => p.plan_type !== 'trial').slice(0, 4).map((plan) => {
              const isMiddle = plans.filter(p => p.plan_type !== 'trial').length > 2
              return (
                <FadeSection key={plan.id}>
                  <div style={{ background: 'linear-gradient(145deg, #ffffff08, #ffffff04)', border: '1px solid #ffffff15', borderRadius: 24, padding: '36px 28px', textAlign: 'center', transition: 'all 0.4s', position: 'relative' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.borderColor = '#ffffff25' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = '#ffffff15' }}>
                    <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 6, color: '#fff' }}>{plan.plan_name}</div>
                    <div style={{ color: '#6666aa', fontSize: 13, marginBottom: 20 }}>{plan.provider_name}</div>
                    <div style={{ fontSize: 44, fontWeight: 900, color: '#fff', marginBottom: 4 }}>
                      {lang === 'fr' ? '€' : '$'}{getPlanPrice(plan)}
                      <span style={{ fontSize: 16, color: '#6666aa', fontWeight: 400 }}>{getPlanLabel(plan)}</span>
                    </div>
                    <ul style={{ listStyle: 'none', margin: '24px 0', padding: 0, textAlign: 'left' }}>
                      {[{ label: `${plan.channels?.toLocaleString() || '?'} ${t('channels')}` }, { label: `${plan.streams} ${t('streams')}` }, { label: t('hd4k') }, { label: t('emailUs') }].map((item, i) => (
                        <li key={i} style={{ padding: '10px 0', borderBottom: '1px solid #ffffff08', color: '#aaa', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ color: '#ff6b35', fontWeight: 700 }}>✓</span> {item.label}
                        </li>
                      ))}
                    </ul>
                    <button onClick={() => setCheckoutPlan(plan)} style={{ display: 'block', width: '100%', padding: 14, borderRadius: 50, fontWeight: 700, fontSize: 15, cursor: 'pointer', transition: 'all 0.3s', marginTop: 8, background: 'transparent', color: '#fff', border: '1.5px solid #ffffff33' }}
                      onMouseEnter={e => { e.target.style.borderColor = '#ff6b35'; e.target.style.color = '#ff6b35' }}
                      onMouseLeave={e => { e.target.style.borderColor = '#ffffff33'; e.target.style.color = '#fff' }}>
                      {t('getStarted')}
                    </button>
                  </div>
                </FadeSection>
              )
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span style={{ display: 'inline-block', padding: '4px 16px', borderRadius: 20, background: '#ff6b3515', color: '#ff6b35', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>{t('testimonials')}</span>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.5rem)', fontWeight: 900, marginBottom: 12 }}>{t('testimonialsTitle')}</h2>
            <p style={{ color: '#6666aa', fontSize: 15, maxWidth: 500, margin: '0 auto' }}>{t('testimonialsSub')}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {[
              { initials: 'A', name: t('t1n'), title: t('t1t'), quote: t('t1'), color: '#ff6b35' },
              { initials: 'S', name: t('t2n'), title: t('t2t'), quote: t('t2'), color: '#ff2d92' },
              { initials: 'O', name: t('t3n'), title: t('t3t'), quote: t('t3'), color: '#00f0ff' },
            ].map((testimonial, i) => (
              <FadeSection key={testimonial.name} delay={i * 100}>
                <div style={{ background: 'linear-gradient(145deg, #ffffff08, #ffffff04)', border: '1px solid #ffffff12', borderRadius: 20, padding: 32, transition: 'all 0.3s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#ff6b3533' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = '#ffffff12' }}>
                  <div style={{ fontSize: 14, marginBottom: 16, color: '#ffaa00' }}>★★★★★</div>
                  <p style={{ color: '#ccc', fontSize: 15, lineHeight: 1.7, marginBottom: 20, fontStyle: 'italic' }}>"{testimonial.quote}"</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg, ${testimonial.color}, #fff)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#000' }}>{testimonial.initials}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{testimonial.name}</div>
                      <div style={{ fontSize: 12, color: '#6666aa' }}>{testimonial.title}</div>
                    </div>
                  </div>
                </div>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ padding: '60px 24px 80px' }}>
        <div style={{ maxWidth: 750, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span style={{ display: 'inline-block', padding: '4px 16px', borderRadius: 20, background: '#ff6b3515', color: '#ff6b35', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>{t('faq')}</span>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.5rem)', fontWeight: 900 }}>{t('faqTitle')}</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ background: '#ffffff08', border: openFaq === i ? '1px solid #ff6b3544' : '1px solid #ffffff12', borderRadius: 12, overflow: 'hidden', transition: 'all 0.3s', cursor: 'pointer' }}>
                <div style={{ padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, fontSize: 15, color: openFaq === i ? '#fff' : '#ddd' }}>
                  {t(`q${i}`)}
                  <span style={{ fontSize: 20, color: openFaq === i ? '#ff6b35' : '#6666aa', transition: 'transform 0.3s', transform: openFaq === i ? 'rotate(45deg)' : 'none', flexShrink: 0 }}>+</span>
                </div>
                <div style={{ padding: openFaq === i ? '0 22px 18px' : '0 22px', maxHeight: openFaq === i ? 300 : 0, overflow: 'hidden', transition: 'all 0.3s', color: '#8888aa', fontSize: 14, lineHeight: 1.7 }}>
                  {t(`a${i}`)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '20px 24px 80px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <FadeSection>
            <div style={{ background: 'linear-gradient(135deg, #ff6b3515, #ff2d9215)', border: '1px solid #ff6b3544', borderRadius: 28, padding: '60px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, #ff6b3510, transparent 60%)' }} />
              <h2 style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2.5rem)', fontWeight: 900, marginBottom: 12, position: 'relative', zIndex: 1, color: '#fff' }}>{t('ctaTitle')}</h2>
              <p style={{ color: '#8888aa', marginBottom: 32, position: 'relative', zIndex: 1 }}>{t('ctaDesc')}</p>
              <button onClick={() => openTrialModal()} style={{ padding: '14px 44px', background: 'linear-gradient(135deg, #ff6b35, #ff2d92)', color: '#fff', borderRadius: 50, fontWeight: 800, fontSize: 16, border: 'none', cursor: 'pointer', boxShadow: '0 4px 30px #ff6b3544', transition: 'all 0.3s', position: 'relative', zIndex: 1 }}
                onMouseEnter={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 8px 40px #ff6b3566' }}
                onMouseLeave={e => { e.target.style.transform = ''; e.target.style.boxShadow = '0 4px 30px #ff6b3544' }}>
                {t('startFree')}
              </button>
            </div>
          </FadeSection>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#030308', borderTop: '1px solid #ffffff08', padding: '60px 24px 30px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 40, marginBottom: 40 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 12 }}>
                <span style={{ background: 'linear-gradient(135deg, #ff6b35, #ff2d92)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>LUX</span>
                <span style={{ color: '#fff' }}>STREAM</span>
              </div>
              <p style={{ color: '#6666aa', fontSize: 14, lineHeight: 1.7 }}>{t('footerDesc')}</p>
            </div>
            <div>
              <h4 style={{ color: '#fff', fontSize: 13, fontWeight: 700, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 }}>{t('quickLinks')}</h4>
              {['#features', '#plans', '#faq'].map((l, i) => (
                <a key={i} href={l} onClick={e => { e.preventDefault(); document.querySelector(l)?.scrollIntoView({ behavior: 'smooth' }) }}
                  style={{ display: 'block', color: '#6666aa', textDecoration: 'none', fontSize: 14, padding: '4px 0', transition: 'color 0.3s' }}
                  onMouseEnter={e => e.target.style.color = '#ff6b35'}
                  onMouseLeave={e => e.target.style.color = '#6666aa'}>
                  {[t('features'), t('plans'), t('faq')][i]}
                </a>
              ))}
            </div>
            <div>
              <h4 style={{ color: '#fff', fontSize: 13, fontWeight: 700, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 }}>{t('support')}</h4>
              <a href="mailto:support@luxstream.tv" style={{ display: 'block', color: '#6666aa', textDecoration: 'none', fontSize: 14, padding: '4px 0', transition: 'color 0.3s' }}
                onMouseEnter={e => e.target.style.color = '#ff6b35'}
                onMouseLeave={e => e.target.style.color = '#6666aa'}>{t('emailUs')}</a>
              <a href="/" style={{ display: 'block', color: '#6666aa', textDecoration: 'none', fontSize: 14, padding: '4px 0', transition: 'color 0.3s' }}
                onMouseEnter={e => e.target.style.color = '#ff6b35'}
                onMouseLeave={e => e.target.style.color = '#6666aa'}>{t('liveChat')}</a>
            </div>
            <div>
              <h4 style={{ color: '#fff', fontSize: 13, fontWeight: 700, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 }}>{t('legal')}</h4>
              {['terms', 'privacy', 'refund'].map(k => (
                <button key={k} onClick={() => setModal(k)} style={{ display: 'block', background: 'transparent', border: 'none', color: '#6666aa', cursor: 'pointer', fontSize: 14, padding: '4px 0', textAlign: 'left', transition: 'color 0.3s' }}
                  onMouseEnter={e => e.target.style.color = '#ff6b35'}
                  onMouseLeave={e => e.target.style.color = '#6666aa'}>
                  {[t('terms'), t('privacy'), t('refund')][['terms', 'privacy', 'refund'].indexOf(k)]}
                </button>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid #ffffff08', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ color: '#444466', fontSize: 13 }}>© {new Date().getFullYear()} LuxStream. {t('rights')}</span>
            <div style={{ display: 'flex', gap: 12 }}>
              {['𝕏', '📺', '💬'].map((s, i) => (
                <a key={i} href="#" style={{ width: 36, height: 36, borderRadius: '50%', background: '#ffffff08', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: '#6666aa', fontSize: 16, transition: 'all 0.3s' }}
                  onMouseEnter={e => { e.target.style.background = '#ff6b3520'; e.target.style.color = '#ff6b35' }}
                  onMouseLeave={e => { e.target.style.background = '#ffffff08'; e.target.style.color = '#6666aa' }}>{s}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {checkoutPlan && <CheckoutModal plan={checkoutPlan} onClose={() => setCheckoutPlan(null)} userToken={localStorage.getItem('user_token')} />}
      {showAuth && <AuthModal settings={settings} onAuth={handleAuth} onClose={() => setShowAuth(false)} />}
      <ChatWidget onBuyPlan={(plan) => setCheckoutPlan(plan)} />

      {/* Trial Modal */}
      {showTrialModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(12px)', padding: 24 }}>
          <div style={{ background: 'linear-gradient(145deg, #0f0f1a, #1a0a1a)', border: '1px solid #ff6b3544', borderRadius: 24, padding: 0, maxWidth: 480, width: '100%', position: 'relative', overflow: 'hidden', boxShadow: '0 20px 80px rgba(0,0,0,0.6)' }}>
            {/* Header */}
            <div style={{ padding: '28px 28px 20px', borderBottom: '1px solid #ffffff10', position: 'relative' }}>
              <button onClick={() => setShowTrialModal(false)} style={{ position: 'absolute', top: 20, right: 20, background: 'transparent', border: 'none', color: '#8888aa', cursor: 'pointer', fontSize: 20, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', transition: 'all 0.3s' }}>✕</button>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🎁</div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{t('trialHeading')}</h2>
              <p style={{ margin: '8px 0 0', color: '#8888aa', fontSize: 14, lineHeight: 1.6 }}>{t('trialDesc')}</p>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 28px 28px' }}>
              {!trialSuccess ? (
                <form onSubmit={handleTrialSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', color: '#8888aa', fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('nameLabel')}</label>
                    <input value={trialForm.name} onChange={e => setTrialForm(f => ({ ...f, name: e.target.value }))} placeholder={t('namePlaceholder')}
                      style={{ width: '100%', padding: '12px 16px', background: '#ffffff08', border: '1px solid #ffffff15', borderRadius: 12, color: '#fff', fontSize: 14, outline: 'none', transition: 'all 0.3s', fontFamily: 'inherit' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#ff6b35', fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('emailLabel')}</label>
                    <input value={trialForm.email} onChange={e => setTrialForm(f => ({ ...f, email: e.target.value }))} placeholder={t('emailPlaceholder')} type="email" required
                      style={{ width: '100%', padding: '12px 16px', background: '#ffffff08', border: '1px solid #ff6b3544', borderRadius: 12, color: '#fff', fontSize: 14, outline: 'none', transition: 'all 0.3s', fontFamily: 'inherit' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#8888aa', fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('whatsappLabel')}</label>
                    <input value={trialForm.phone} onChange={e => setTrialForm(f => ({ ...f, phone: e.target.value }))} placeholder={t('whatsappPlaceholder')}
                      style={{ width: '100%', padding: '12px 16px', background: '#ffffff08', border: '1px solid #ffffff15', borderRadius: 12, color: '#fff', fontSize: 14, outline: 'none', transition: 'all 0.3s', fontFamily: 'inherit' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#8888aa', fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>📱 Your Device</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {APPS_LIST.map(a => (
                        <button key={a.id} type="button" onClick={() => setTrialForm(f => ({ ...f, preferredApp: a.id }))} style={{
                          padding: '8px', background: trialForm.preferredApp === a.id ? '#ff6b3520' : '#ffffff08',
                          border: trialForm.preferredApp === a.id ? '1.5px solid #ff6b35' : '1px solid #ffffff15',
                          borderRadius: 10, cursor: 'pointer', color: trialForm.preferredApp === a.id ? '#ff6b35' : '#8888aa',
                          fontSize: 11, textAlign: 'center', transition: 'all 0.15s',
                        }}>
                          <div style={{ fontSize: 18 }}>{a.icon}</div>
                          <div style={{ fontWeight: 700, marginTop: 2 }}>{a.name}</div>
                          <div style={{ fontSize: 9, color: '#666' }}>{a.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#ff6b35', fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('providerLabel')}</label>
                    <select value={trialForm.providerId} onChange={e => setTrialForm(f => ({ ...f, providerId: e.target.value }))} required
                      style={{ width: '100%', padding: '12px 16px', background: '#ffffff08', border: '1px solid #ff6b3544', borderRadius: 12, color: '#fff', fontSize: 14, outline: 'none', transition: 'all 0.3s', fontFamily: 'inherit', appearance: 'auto', cursor: 'pointer' }}>
                      <option value="" style={{ background: '#1a1a2e' }}>{t('selectProvider')}</option>
                      {trialProviders.map(p => (
                        <option key={p.id} value={p.id} style={{ background: '#1a1a2e' }}>{p.name} — {p.plan_name}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" disabled={trialSubmitting} style={{
                    width: '100%', padding: '14px', background: 'linear-gradient(135deg, #ff6b35, #ff2d92)', color: '#fff',
                    border: 'none', borderRadius: 12, fontWeight: 800, cursor: 'pointer', fontSize: 15,
                    opacity: trialSubmitting ? 0.6 : 1, marginTop: 8, transition: 'all 0.3s', boxShadow: '0 4px 20px #ff6b3544'
                  }}>
                    {trialSubmitting ? t('sendingTrial') : t('getTrial')}
                  </button>
                </form>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                  <h3 style={{ color: '#00ff88', fontWeight: 800, margin: '0 0 12px', fontSize: 20 }}>{t('trialReady')}</h3>
                  <p style={{ color: '#8888aa', fontSize: 14, margin: '0 0 8px' }}>{t('sentTo')}</p>
                  <p style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: '0 0 16px' }}>{trialForm.email}</p>
                  <div style={{ background: '#ffffff08', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ color: '#8888aa', fontSize: 13 }}>{t('provider')}</span>
                      <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{trialSuccess.provider_name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#8888aa', fontSize: 13 }}>{t('duration')}</span>
                      <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{trialSuccess.duration_hours} {t('hours')}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 14, color: '#8888aa', marginBottom: 16 }}>
                    Consultez votre boîte email ou ouvrez votre <strong style={{ color: '#00d4ff' }}>page d'activation</strong>
                  </div>
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <a href={`/activate?token=${encodeURIComponent(trialForm.email)}`} target="_blank" rel="noopener noreferrer" style={{ padding: '12px 24px', background: '#00d4ff', color: '#000', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: 14, textDecoration: 'none', display: 'inline-block' }}>
                      📖 Guide d'installation
                    </a>
                    <button onClick={() => { setShowTrialModal(false); document.querySelector('#plans')?.scrollIntoView({ behavior: 'smooth' }) }} style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #ff6b35, #ff2d92)', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                      {t('upgrade')}
                    </button>
                    <button onClick={() => setShowTrialModal(false)} style={{ padding: '12px 24px', background: 'transparent', color: '#8888aa', border: '1px solid #ffffff15', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                      {t('close')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
          <div style={{ background: '#0f0f1a', border: '1px solid #ff6b3544', borderRadius: 20, padding: 36, maxWidth: 520, width: '90%', position: 'relative' }}>
            <button onClick={() => setModal(null)} style={{ position: 'absolute', top: 16, right: 20, background: 'transparent', border: 'none', color: '#8888aa', cursor: 'pointer', fontSize: 20 }}>✕</button>
            <h2 style={{ margin: '0 0 16px', fontSize: 20, color: '#ff6b35' }}>
              {modal === 'terms' ? 'Terms of Service' : modal === 'privacy' ? 'Privacy Policy' : 'Refund Policy'}
            </h2>
            <p style={{ color: '#8888aa', fontSize: 14, lineHeight: 1.7 }}>
              {modal === 'terms' ? 'By using LuxStream, you agree to use the service for personal, lawful purposes only. All subscriptions are non-refundable after credentials are delivered unless a technical issue cannot be resolved within 24 hours.' :
               modal === 'privacy' ? 'We collect your name, email, and payment information solely to fulfill your order. We do not sell your data. Payment processing is handled by secure third-party providers. Request data deletion anytime via support.' :
               'Due to the digital nature of our service, all sales are final once credentials are delivered. If you experience a technical issue within 24 hours that we cannot resolve, we will issue a full refund. Trial accounts are not eligible for refunds.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}