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
  const [planInterval, setPlanInterval] = useState('month')
  const [user, setUser] = useState(null)
  const [subscriptions, setSubscriptions] = useState([])
  const [showAuth, setShowAuth] = useState(false)
  const [settings, setSettings] = useState(null)
  const [videoLoaded, setVideoLoaded] = useState(false)

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
    api.get('/plans').then(r => {
      const all = r.data.filter(p => p.plan_type !== 'trial')
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

  const getPlanPrice = (p) => planInterval === 'year' ? ((p.price_sell || 0) * 10).toFixed(2) : (p.price_sell || 0).toFixed(2)
  const getPlanLabel = (p) => planInterval === 'year' ? `/${t('yearly').toLowerCase().replace(' ', '')}` : (p.duration_days <= 31 ? `/${t('monthly').toLowerCase()}` : `/${p.duration_days}d`)
  const isPopular = (p) => p.plan_name?.toLowerCase() === 'premium' || p.plan_name?.toLowerCase() === 'familial' || p.plan_name?.toLowerCase() === 'famille'

  const navLinks = [
    { label: t('features'), href: '#features' },
    { label: t('plans'), href: '#plans' },
    { label: t('faq'), href: '#faq' },
  ]

  return (
    <div style={{ background: '#050510', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif', minHeight: '100vh' }}>
      <style>{`
        .fade-up { opacity: 0; transform: translateY(30px); transition: all 0.6s ease-out; }
        .fade-up.visible { opacity: 1; transform: translateY(0); }
        @keyframes pulse-glow { 0%,100% { box-shadow: 0 0 20px #ff6b3522; } 50% { box-shadow: 0 0 40px #ff6b3544; } }
        @keyframes grid-drift { 0% { transform: translate(0,0); } 100% { transform: translate(80px,80px); } }
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
          {Array(3).fill(['⚽ FIFA WC 2026 — All 64 Matches Live in 4K', '🎬 10,000+ Movies On Demand', '📺 5,000+ TV Series — Full Seasons', '🔥 Premier League — Every Match Live', '🎯 NBA, NFL, UFC — All Sports 24/7', '⚡ Instant Setup — Under 5 Minutes', '🌍 25,000+ Channels — Global Coverage']).map((items, i) =>
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
            <div style={{ display: 'flex', gap: 28, flex: 1, justifyContent: 'center' }}>
              {navLinks.map(l => (
                <a key={l.label} href={l.href} onClick={e => { e.preventDefault(); document.querySelector(l.href)?.scrollIntoView({ behavior: 'smooth' }) }}
                  style={{ color: '#8888aa', textDecoration: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.target.style.color = '#fff'}
                  onMouseLeave={e => e.target.style.color = '#8888aa' }>
                  {l.label}
                </a>
              ))}
            </div>
          )}
          {!isMobile && (
            <>
              {user ? (
                <UserMenu user={user} subscriptions={subscriptions} onSignOut={handleSignOut} />
              ) : (
                <button onClick={() => setShowAuth(true)} style={{ padding: '8px 18px', background: 'transparent', color: '#fff', border: '1px solid #ffffff22', borderRadius: 50, fontWeight: 600, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}>
                  {t('signIn')}
                </button>
              )}
              <button onClick={() => window.__showTrialForm?.()} style={{ padding: '9px 24px', background: 'linear-gradient(135deg, #ff6b35, #ff2d92)', color: '#fff', border: 'none', borderRadius: 50, fontWeight: 700, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap', boxShadow: '0 4px 20px #ff6b3533', transition: 'all 0.3s' }}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 0', borderTop: '1px solid #ffffff10', animation: 'fadeIn 0.2s' }}>
            {navLinks.map(l => (
              <a key={l.label} href={l.href} onClick={e => { e.preventDefault(); document.querySelector(l.href)?.scrollIntoView({ behavior: 'smooth' }); setMobileMenu(false) }}
                style={{ color: '#8888aa', textDecoration: 'none', fontSize: 14, padding: '6px 0' }}>{l.label}</a>
            ))}
            <button onClick={() => { setMobileMenu(false); window.__showTrialForm?.() }} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #ff6b35, #ff2d92)', color: '#fff', border: 'none', borderRadius: 50, fontWeight: 700, cursor: 'pointer', fontSize: 13, textAlign: 'center', marginTop: 4 }}>
              {t('freeTrial')}
            </button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden', padding: '60px 24px' }}>
        <div style={{ position: 'absolute', inset: 0, background: "radial-gradient(ellipse at 20% 50%, #ff6b3520 0%, transparent 50%), radial-gradient(ellipse at 80% 50%, #ff2d9220 0%, transparent 50%), radial-gradient(ellipse at 50% 0%, #ff6b3510 0%, transparent 40%)", zIndex: 0 }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(#ff6b3515 1px, transparent 1px)', backgroundSize: '40px 40px', zIndex: 0, maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)', WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)' }} />
        
        {/* Floating orbs */}
        <div style={{ position: 'absolute', top: '20%', left: '15%', width: 200, height: 200, background: 'radial-gradient(circle, #ff6b3525, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)', zIndex: 0 }} className="hero-orb" />
        <div style={{ position: 'absolute', bottom: '20%', right: '15%', width: 250, height: 250, background: 'radial-gradient(circle, #ff2d9225, transparent 70%)', borderRadius: '50%', filter: 'blur(50px)', zIndex: 0 }} className="hero-orb" />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 950 }}>
          <div style={{ display: 'inline-block', padding: '6px 20px', borderRadius: 20, background: 'linear-gradient(135deg, #ff6b3520, #ff2d9220)', border: '1px solid #ff6b3544', color: '#ff6b35', fontSize: 13, fontWeight: 700, marginBottom: 28, letterSpacing: '1px' }}>{t('badge')}</div>
          
          <h1 style={{ fontSize: 'clamp(2.8rem, 6vw, 5.5rem)', fontWeight: 900, lineHeight: 1.05, marginBottom: 24, background: 'linear-gradient(135deg, #fff 20%, #ff6b35 60%, #ff2d92 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            <span dangerouslySetInnerHTML={{ __html: t('heroTitle') }} />
          </h1>
          
          <p style={{ fontSize: 'clamp(1rem, 1.8vw, 1.3rem)', color: '#8888aa', maxWidth: 680, margin: '0 auto 40px', lineHeight: 1.8 }}>
            {t('heroDesc')}
          </p>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 50 }}>
            <button onClick={() => document.querySelector('#plans')?.scrollIntoView({ behavior: 'smooth' })}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 40px', background: 'linear-gradient(135deg, #ff6b35, #ff2d92)', color: '#fff', borderRadius: 50, fontWeight: 800, fontSize: 15, border: 'none', cursor: 'pointer', transition: 'all 0.3s', boxShadow: '0 4px 30px #ff6b3544' }}
              onMouseEnter={e => { e.target.style.transform = 'translateY(-3px) scale(1.02)'; e.target.style.boxShadow = '0 8px 40px #ff6b3566' }}
              onMouseLeave={e => { e.target.style.transform = ''; e.target.style.boxShadow = '0 4px 30px #ff6b3544' }}>
              ▶ {t('watchNow')}
            </button>
            <button onClick={() => window.__showTrialForm?.()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 40px', background: 'transparent', color: '#fff', borderRadius: 50, fontWeight: 700, fontSize: 15, border: '1.5px solid #ffffff22', cursor: 'pointer', transition: 'all 0.3s' }}
              onMouseEnter={e => { e.target.style.borderColor = '#ff6b3566'; e.target.style.color = '#ff6b35' }}
              onMouseLeave={e => { e.target.style.borderColor = '#ffffff22'; e.target.style.color = '#fff' }}>
              ✦ {t('freeTrial')}
            </button>
          </div>

          {/* Live stats */}
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { num: '25K+', lbl: t('channels'), icon: '📺', color: '#ff6b35' },
              { num: '4K HDR', lbl: 'Quality', icon: '🎯', color: '#ff2d92' },
              { num: '99.9%', lbl: t('uptime'), icon: '⚡', color: '#ff6b35' },
              { num: '<5min', lbl: 'Setup', icon: '🚀', color: '#ff2d92' },
            ].map((s, i) => (
              <div key={s.lbl} style={{ background: '#ffffff08', border: '1px solid #ffffff12', borderRadius: 14, padding: '16px 24px', textAlign: 'center', backdropFilter: 'blur(12px)', transition: 'all 0.3s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#ffffff12'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#ff6b3544' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#ffffff08'; e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = '#ffffff12' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.num}</div>
                <div style={{ fontSize: 12, color: '#6666aa', marginTop: 4 }}>{s.lbl}</div>
              </div>
            ))}
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
              <div style={{ fontSize: 13, color: '#8888aa' }}>FIFA 2026 — All 64 Matches Live</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {['🏆 Group Stage', '⚡ Knockout', '🎯 Final', '📺 All in 4K HDR'].map(l => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ff6b35', fontSize: 13, fontWeight: 700 }}>
                <span style={{ fontSize: 16 }}>✓</span> {l}
              </div>
            ))}
          </div>
          <button onClick={() => window.__showTrialForm?.()} style={{ padding: '10px 28px', background: 'linear-gradient(135deg, #ff6b35, #ff2d92)', color: '#fff', border: 'none', borderRadius: 50, fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 20px #ff6b3544' }}>
            Watch Free Trial ⚽
          </button>
        </div>
      </section>

      {/* Content Categories */}
      <section id="features" style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1300, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <span style={{ display: 'inline-block', padding: '4px 16px', borderRadius: 20, background: '#ff6b3515', color: '#ff6b35', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 16 }}>Premium Content</span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 3rem)', fontWeight: 900, marginBottom: 12 }}>Everything You Want to Watch</h2>
            <p style={{ color: '#6666aa', fontSize: 16, maxWidth: 550, margin: '0 auto' }}>From live sports to blockbuster movies — LuxStream delivers the ultimate entertainment experience.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {/* World Cup Card */}
            <FadeSection delay={0}>
              <div className="content-card" style={{ background: 'linear-gradient(145deg, #1a0808, #0f0508)', border: '1px solid #ff6b3533', borderRadius: 20, overflow: 'hidden', transition: 'all 0.4s', cursor: 'pointer', position: 'relative' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.boxShadow = '0 20px 60px #ff6b3522' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
                <div style={{ height: 180, background: 'linear-gradient(135deg, #ff6b3520, #ff2d9215)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, position: 'relative', overflow: 'hidden' }}>
                  <div className="card-img" style={{ fontSize: 72 }}>⚽</div>
                  <div style={{ position: 'absolute', top: 12, left: 12, background: '#ff6b35', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800 }}>LIVE 2026</div>
                  <div style={{ position: 'absolute', top: 12, right: 12, background: '#ff2d92', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800 }}>🔥 HOT</div>
                </div>
                <div style={{ padding: '24px 20px' }}>
                  <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: '#fff' }}>{t('worldCupTitle')}</h3>
                  <p style={{ color: '#8888aa', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>{t('worldCupDesc')}</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['64 Matches', '4K HDR', 'All Languages', 'Replay'].map(tag => (
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
                  <div style={{ position: 'absolute', top: 12, left: 12, background: '#7b2dff', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800 }}>VOD</div>
                </div>
                <div style={{ padding: '24px 20px' }}>
                  <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: '#fff' }}>{t('moviesTitle')}</h3>
                  <p style={{ color: '#8888aa', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>{t('moviesDesc')}</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['Hollywood', 'Arabic', 'Bollywood', '4K'].map(tag => (
                      <span key={tag} style={{ background: '#7b2dff15', color: '#7b2dff', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{tag}</span>
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
                  <div style={{ position: 'absolute', top: 12, left: 12, background: '#00f0ff', color: '#000', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800 }}>SERIES</div>
                </div>
                <div style={{ padding: '24px 20px' }}>
                  <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: '#fff' }}>{t('seriesTitle')}</h3>
                  <p style={{ color: '#8888aa', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>{t('seriesDesc')}</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['Netflix Style', 'Full Seasons', 'Daily Updates', 'HD'].map(tag => (
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
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#000' }} />LIVE
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
              { icon: '📺', title: '25,000+ Channels', desc: 'Every country, every category', color: '#ff6b35' },
              { icon: '🎯', title: '4K HDR Quality', desc: 'Crystal clear streaming', color: '#ff2d92' },
              { icon: '⚡', title: 'Zero Buffering', desc: '99.9% uptime guaranteed', color: '#00f0ff' },
              { icon: '📱', title: 'All Devices', desc: 'Smart TV, Firestick, Mobile', color: '#00ff88' },
              { icon: '🎧', title: '24/7 Support', desc: 'Real humans, fast replies', color: '#ffd700' },
              { icon: '🔒', title: 'Secure & Private', desc: 'No logs, encrypted', color: '#7b2dff' },
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

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
            <div style={{ display: 'flex', background: '#ffffff08', borderRadius: 50, padding: 4, gap: 4 }}>
              <button onClick={() => setPlanInterval('month')} style={{ padding: '8px 24px', borderRadius: 50, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: planInterval === 'month' ? 'linear-gradient(135deg, #ff6b35, #ff2d92)' : 'transparent', color: planInterval === 'month' ? '#fff' : '#6666aa', transition: 'all 0.2s' }}>{t('monthly')}</button>
              <button onClick={() => setPlanInterval('year')} style={{ padding: '8px 24px', borderRadius: 50, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: planInterval === 'year' ? 'linear-gradient(135deg, #ff6b35, #ff2d92)' : 'transparent', color: planInterval === 'year' ? '#fff' : '#6666aa', transition: 'all 0.2s' }}>{t('yearly')} <span style={{ fontSize: 10, opacity: 0.8 }}>{t('save')}</span></button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 24, maxWidth: 1000, margin: '0 auto' }}>
            {plans.filter(p => p.plan_type !== 'trial').slice(0, 4).map((plan) => {
              const popular = isPopular(plan)
              return (
                <FadeSection key={plan.id}>
                  <div style={{ background: popular ? 'linear-gradient(145deg, #ff6b3510, #ff2d9208)' : 'linear-gradient(145deg, #ffffff08, #ffffff04)', border: popular ? '1px solid #ff6b3544' : '1px solid #ffffff15', borderRadius: 24, padding: '36px 28px', textAlign: 'center', transition: 'all 0.4s', position: 'relative' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-8px)'; if (!popular) e.currentTarget.style.borderColor = '#ffffff25' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; if (!popular) e.currentTarget.style.borderColor = '#ffffff15' }}>
                    {popular && <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #ff6b35, #ff2d92)', color: '#fff', padding: '5px 24px', borderRadius: 20, fontSize: 12, fontWeight: 800, boxShadow: '0 4px 20px #ff6b3544' }}>{t('mostPopular')}</div>}
                    <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 6, color: '#fff' }}>{plan.plan_name}</div>
                    <div style={{ color: '#6666aa', fontSize: 13, marginBottom: 20 }}>{plan.provider_name}</div>
                    <div style={{ fontSize: 44, fontWeight: 900, color: '#fff', marginBottom: 4 }}>
                      {lang === 'fr' ? '€' : '$'}{getPlanPrice(plan)}
                      <span style={{ fontSize: 16, color: '#6666aa', fontWeight: 400 }}>{getPlanLabel(plan)}</span>
                    </div>
                    <ul style={{ listStyle: 'none', margin: '24px 0', padding: 0, textAlign: 'left' }}>
                      {[{ label: `${plan.channels?.toLocaleString() || '?'} ${t('channels')}` }, { label: `${plan.streams} ${t('streams')}` }, { label: t('hd4k') }, { label: popular ? t('support24') : t('emailUs') }].map((item, i) => (
                        <li key={i} style={{ padding: '10px 0', borderBottom: '1px solid #ffffff08', color: '#aaa', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ color: '#ff6b35', fontWeight: 700 }}>✓</span> {item.label}
                        </li>
                      ))}
                    </ul>
                    <button onClick={() => setCheckoutPlan(plan)} style={{ display: 'block', width: '100%', padding: 14, borderRadius: 50, fontWeight: 700, fontSize: 15, cursor: 'pointer', transition: 'all 0.3s', marginTop: 8, background: popular ? 'linear-gradient(135deg, #ff6b35, #ff2d92)' : 'transparent', color: popular ? '#fff' : '#fff', border: popular ? 'none' : '1.5px solid #ffffff33' }}
                      onMouseEnter={e => { if (popular) { e.target.style.boxShadow = '0 4px 20px #ff6b3544'; e.target.style.transform = 'translateY(-2px)' } else { e.target.style.borderColor = '#ff6b35'; e.target.style.color = '#ff6b35' } }}
                      onMouseLeave={e => { if (popular) { e.target.style.boxShadow = ''; e.target.style.transform = '' } else { e.target.style.borderColor = '#ffffff33'; e.target.style.color = '#fff' } }}>
                      {popular ? t('subscribe') : t('getStarted')}
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
              <button onClick={() => window.__showTrialForm?.()} style={{ padding: '14px 44px', background: 'linear-gradient(135deg, #ff6b35, #ff2d92)', color: '#fff', borderRadius: 50, fontWeight: 800, fontSize: 16, border: 'none', cursor: 'pointer', boxShadow: '0 4px 30px #ff6b3544', transition: 'all 0.3s', position: 'relative', zIndex: 1 }}
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
      <ChatWidget />

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