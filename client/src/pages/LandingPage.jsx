import { useState, useEffect, useRef } from 'react'
import api from '../api'
import ChatWidget from '../components/ChatWidget'
import CheckoutModal from '../components/CheckoutModal'
import AuthModal from '../components/AuthModal'
import UserMenu from '../components/UserMenu'

const features = [
  { icon: '📺', title: '25,000+ Live Channels', desc: 'Global coverage with sports, news, entertainment from every country.' },
  { icon: '🎯', title: '4K HDR Streaming', desc: 'Crystal-clear picture with HDR support on all premium channels.' },
  { icon: '⚽', title: 'World Cup & Live Sports', desc: 'Every match live — World Cup 2026, Champions League, Premier League, NBA, NFL, and more in 4K.' },
  { icon: '📱', title: 'All Devices', desc: 'Smart TV, Firestick, Android, iOS, PC, Mac — one subscription covers everything.' },
  { icon: '🎬', title: 'Blockbuster Movies', desc: 'Thousands of movies on demand — Hollywood, Bollywood, Arabic cinema, and international films in HD & 4K.' },
  { icon: '📺', title: 'TV Series Library', desc: 'Full seasons of trending series, Netflix-style originals, and classic shows. New episodes added daily.' },
]

const testimonials = [
  { initials: 'M', name: 'Mike R.', title: 'Sports fan, 2 years', quote: 'Finally cut the cord! Better channels than my cable provider at a fraction of the cost. The 4K sports channels are incredible.' },
  { initials: 'L', name: 'Layla H.', title: 'Family plan, 1 year', quote: 'Setup took less than 5 minutes. My whole family uses it on different devices. The Arabic channel selection is the best I\'ve found.' },
  { initials: 'D', name: 'David K.', title: 'Premium user, 6 months', quote: 'I was skeptical but the free trial convinced me. Zero buffering, amazing picture quality, and support is super responsive.' },
]

const faqs = [
  { q: 'What is IPTV?', a: 'IPTV (Internet Protocol Television) delivers live TV channels over the internet instead of traditional cable or satellite. Watch on any device with an internet connection — Smart TV, Firestick, phone, tablet, or computer.' },
  { q: 'Which devices are supported?', a: 'All major platforms: Android TV, Amazon Firestick, iOS/Apple TV, Android phones/tablets, Smart TVs (Samsung, LG, Sony), MAG boxes, and PC/Mac via VLC or IPTV players like TiviMate and IPTV Smarters.' },
  { q: 'How do I get started?', a: 'Choose a plan, complete payment, and receive your login credentials instantly via email. Download an IPTV player app, enter your credentials, and start watching. Average setup time is under 5 minutes.' },
  { q: 'Is there a money-back guarantee?', a: 'Absolutely! We offer a 7-day money-back guarantee on all paid plans. If you\'re not completely satisfied, contact support within 7 days for a full refund — no questions asked.' },
  { q: 'Do you offer a free trial?', a: 'Yes! We offer a 3-day free trial so you can test our service risk-free. Click the chat bubble to get your trial set up instantly. No credit card required.' },
  { q: 'Do you have World Cup 2026 channels?', a: 'Yes! We broadcast every World Cup 2026 match live in 4K HDR, including all group stages, knockout rounds, and the final. Our sports coverage also includes Premier League, La Liga, Serie A, Champions League, and more.' },
  { q: 'What movies and series are available?', a: 'Our library includes over 10,000 movies and 5,000 TV series across every genre — Hollywood blockbusters, Arabic cinema, Bollywood, Turkish dramas, documentaries, and exclusive original content.' },
]

const modalContent = {
  terms: {
    title: 'Terms of Service',
    body: `These Terms of Service govern your use of ${typeof siteName !== 'undefined' ? siteName : 'IPTV Boss'} services. By purchasing a subscription, you agree to use the service for personal, lawful purposes only. All sales are final unless covered by our refund policy. We reserve the right to terminate accounts that violate these terms.`,
  },
  privacy: {
    title: 'Privacy Policy',
    body: 'We collect your name, email, and payment information solely to fulfill your order and send you account credentials. We do not sell your data to third parties. Payment processing is handled by secure third-party providers. You may request deletion of your data at any time by contacting support.',
  },
  refund: {
    title: 'Refund Policy',
    body: 'Due to the digital nature of our products, all sales are generally final once credentials have been delivered. If you experience a technical issue within 24 hours of purchase that we cannot resolve, we will issue a full refund. Trial accounts are not eligible for refunds.',
  },
}

const ws = typeof window !== 'undefined' && window.__WEBSITE__
const siteName = ws?.site_name || ws?.name || 'IPTV Boss'
const logoUrl = ws?.logo_url || ''

function useFadeIn() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target) } })
    }, { threshold: 0.1 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return ref
}

function FadeSection({ children, style }) {
  const ref = useFadeIn()
  return <div ref={ref} className="fade-up" style={style}>{children}</div>
}

export default function LandingPage() {
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

  useEffect(() => {
    fetch('/api/checkout/settings').then(r => r.json()).then(setSettings).catch(() => {})
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('user_token')
    if (token) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(data => {
          if (data.user) { setUser(data.user); setSubscriptions(data.subscriptions || []) }
          else localStorage.removeItem('user_token')
        }).catch(() => { localStorage.removeItem('user_token') })
    }
  }, [])

  function handleAuth(userData, token) {
    setUser(userData)
    setShowAuth(false)
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => {
        if (data.subscriptions) setSubscriptions(data.subscriptions)
      }).catch(() => {})
  }

  function handleSignOut() {
    localStorage.removeItem('user_token')
    setUser(null)
    setSubscriptions([])
  }

  useEffect(() => {
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
  }, [])

  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768) }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const getPlanPrice = (p) => {
    if (planInterval === 'year') return ((p.price_sell || 0) * 10).toFixed(2)
    return (p.price_sell || 0).toFixed(2)
  }

  const getPlanLabel = (p) => {
    if (planInterval === 'year') return '/yr'
    return p.duration_days <= 31 ? '/mo' : `/${p.duration_days}d`
  }

  const isPopular = (p) => {
    return p.plan_name?.toLowerCase() === 'premium'
  }

  function handleBuyNow(plan) {
    setCheckoutPlan(plan)
  }

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Plans', href: '#plans' },
    { label: 'FAQ', href: '#faq' },
    { label: 'Contact', href: '#contact' },
  ]

  return (
    <div style={{ background: '#0a0a0a', color: '#fff', fontFamily: 'Sora, system-ui, sans-serif', minHeight: '100vh' }}>
      <style>{`
        .fade-up { opacity: 0; transform: translateY(30px); transition: all 0.6s ease-out; }
        .fade-up.visible { opacity: 1; transform: translateY(0); }
        @keyframes spin-slow { to { transform: rotate(360deg); } }
        @keyframes pulse-soft { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes grid-move { 0% { transform: translate(0,0); } 100% { transform: translate(60px,60px); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #3a3a3a; }
      `}</style>

      <nav style={{ position: 'sticky', top: 0, background: '#0a0a0acc', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid #ffffff12', zIndex: 100, padding: '0 20px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', height: 64, gap: 32 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#00d4ff', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
            {logoUrl && <img src={logoUrl} alt="" style={{ height: 28, width: 'auto' }} />}
            {siteName}
          </div>
          {!isMobile && (
            <div style={{ display: 'flex', gap: 28, flex: 1, justifyContent: 'center' }}>
              {navLinks.map(l => (
                <a key={l.label} href={l.href} onClick={e => { e.preventDefault(); document.querySelector(l.href)?.scrollIntoView({ behavior: 'smooth' }); setMobileMenu(false) }}
                  style={{ color: '#a0a0a0', textDecoration: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'color 0.2s', padding: '4px 0', position: 'relative' }}>
                  {l.label}
                  <span style={{ position: 'absolute', bottom: -2, left: 0, width: '100%', height: 2, background: '#00d4ff', borderRadius: 1, transform: 'scaleX(0)', transition: 'transform 0.3s', transformOrigin: 'left' }}
                    onMouseEnter={e => { e.target.style.transform = 'scaleX(1)'; e.currentTarget.parentElement.style.color = '#fff' }}
                    onMouseLeave={e => { e.target.style.transform = 'scaleX(0)'; e.currentTarget.parentElement.style.color = '#a0a0a0' }} />
                </a>
              ))}
            </div>
          )}
          {!isMobile && (
            <>
              {user ? (
                <UserMenu user={user} subscriptions={subscriptions} onSignOut={handleSignOut} />
              ) : (
                <button onClick={() => setShowAuth(true)} style={{
                  padding: '8px 18px', background: 'transparent', color: '#fff', border: '1px solid #ffffff33',
                  borderRadius: 50, fontWeight: 600, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap', marginLeft: 'auto',
                  transition: 'all 0.2s',
                }} onMouseEnter={e => { e.target.style.borderColor = '#ffffff66'; e.target.style.color = '#00d4ff' }}
                  onMouseLeave={e => { e.target.style.borderColor = '#ffffff33'; e.target.style.color = '#fff' }}>
                  Sign In
                </button>
              )}
              <button onClick={() => window.__showTrialForm?.()} style={{
                padding: '8px 22px', background: '#00d4ff', color: '#000', border: 'none',
                borderRadius: 50, fontWeight: 700, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap',
                transition: 'all 0.3s',
              }} onMouseEnter={e => { e.target.style.boxShadow = '0 4px 20px #00d4ff44'; e.target.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.target.style.boxShadow = 'none'; e.target.style.transform = 'none' }}>
                ✦ Free Trial
              </button>
            </>
          )}
          <button onClick={() => setMobileMenu(!mobileMenu)} style={{ display: isMobile ? 'block' : 'none', background: 'transparent', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', padding: 8, marginLeft: 'auto', transition: 'transform 0.2s', transform: mobileMenu ? 'rotate(90deg)' : 'none' }}>
            {mobileMenu ? '✕' : '☰'}
          </button>
        </div>
        <div style={{
          display: mobileMenu && isMobile ? 'flex' : 'none',
          flexDirection: 'column', gap: 12, padding: '16px 0',
          borderTop: '1px solid #ffffff12',
          animation: 'fadeIn 0.2s ease-out',
        }}>
          {navLinks.map(l => (
            <a key={l.label} href={l.href} onClick={e => { e.preventDefault(); document.querySelector(l.href)?.scrollIntoView({ behavior: 'smooth' }); setMobileMenu(false) }}
              style={{ color: '#a0a0a0', textDecoration: 'none', fontSize: 14, padding: '6px 0', transition: 'color 0.2s', borderBottom: '1px solid #ffffff08' }}
              onMouseEnter={e => e.target.style.color = '#fff'}
              onMouseLeave={e => e.target.style.color = '#a0a0a0'}>
              {l.label}
            </a>
          ))}
          {!user && (
            <button onClick={() => { setMobileMenu(false); setShowAuth(true) }} style={{
              padding: '10px 20px', background: 'transparent', color: '#fff', border: '1px solid #ffffff33',
              borderRadius: 50, fontWeight: 600, cursor: 'pointer', fontSize: 13, textAlign: 'center', marginTop: 4,
            }}>
              Sign In
            </button>
          )}
          <button onClick={() => { setMobileMenu(false); window.__showTrialForm?.() }} style={{
            padding: '10px 20px', background: '#00d4ff', color: '#000', border: 'none',
            borderRadius: 50, fontWeight: 700, cursor: 'pointer', fontSize: 13, textAlign: 'center', marginTop: 4,
          }}>
            ✦ Free Trial
          </button>
        </div>
      </nav>

      <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden', padding: '80px 24px' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 50%, #00d4ff15 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, #00ff8815 0%, transparent 60%), radial-gradient(ellipse at 50% 0%, #00d4ff08 0%, transparent 50%)', zIndex: 0 }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(#ffffff08 1px, transparent 1px), linear-gradient(90deg, #ffffff08 1px, transparent 1px)', backgroundSize: '60px 60px', zIndex: 0, maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)', WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 900 }}>
          <div style={{ display: 'inline-block', padding: '6px 18px', borderRadius: 20, background: '#00d4ff15', border: '1px solid #00d4ff33', color: '#00d4ff', fontSize: 13, fontWeight: 700, marginBottom: 24, letterSpacing: '0.5px' }}>✧ Premium IPTV Service</div>
          <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: 20, background: 'linear-gradient(135deg, #fff 30%, #00d4ff 70%, #00ff88)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Stream Everything.<br />Pay Once.
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 1.8vw, 1.25rem)', color: '#999', maxWidth: 640, margin: '0 auto 36px', lineHeight: 1.7 }}>
            Premium IPTV with 25,000+ live channels including World Cup 2026, blockbuster movies, and trending series in stunning 4K HDR quality.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => document.querySelector('#plans')?.scrollIntoView({ behavior: 'smooth' })}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 36px', background: '#00d4ff', color: '#000', borderRadius: 50, fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer', transition: 'all 0.3s' }}
              onMouseEnter={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 8px 30px #00d4ff44' }}
              onMouseLeave={e => { e.target.style.transform = ''; e.target.style.boxShadow = '' }}>
              ▶ View Plans
            </button>
            <button onClick={() => window.__showTrialForm?.()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 36px', background: 'transparent', color: '#fff', borderRadius: 50, fontWeight: 600, fontSize: 16, border: '1.5px solid #ffffff33', cursor: 'pointer', transition: 'all 0.3s' }}
              onMouseEnter={e => { e.target.style.borderColor = '#00d4ff'; e.target.style.color = '#00d4ff'; e.target.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.target.style.borderColor = '#ffffff33'; e.target.style.color = '#fff'; e.target.style.transform = '' }}>
              Free Trial →
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginTop: 60, maxWidth: 640, marginLeft: 'auto', marginRight: 'auto', width: '100%' }}>
            {[{ num: '25K+', lbl: 'Live Channels' }, { num: '4K', lbl: 'Ultra HD' }, { num: '99.9%', lbl: 'Uptime' }, { num: '5min', lbl: 'Setup' }].map(s => (
              <div key={s.lbl} style={{ background: '#ffffff08', border: '1px solid #ffffff15', borderRadius: 12, padding: '20px 12px', textAlign: 'center', backdropFilter: 'blur(12px)', transition: 'all 0.3s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#ffffff12'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#00d4ff33' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#ffffff08'; e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = '#ffffff15' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#00d4ff' }}>{s.num}</div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center' }}><span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 20, background: '#00d4ff10', color: '#00d4ff', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>Why Choose Us</span></div>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.5rem)', fontWeight: 800, textAlign: 'center', marginBottom: 12 }}>Everything You Need in One Place</h2>
          <p style={{ textAlign: 'center', color: '#666', fontSize: 15, maxWidth: 600, margin: '0 auto 48px' }}>Premium streaming with zero compromises. From live sports to blockbuster movies, we've got you covered.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {features.map((f, i) => (
              <FadeSection key={f.title}>
                <div style={{ background: 'linear-gradient(145deg, #ffffff08, #ffffff04)', border: '1px solid #ffffff12', borderRadius: 16, padding: '28px 24px', transition: 'all 0.4s', position: 'relative', overflow: 'hidden' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.borderColor = '#ffffff22'; e.currentTarget.style.background = 'linear-gradient(145deg, #ffffff10, #ffffff06)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = '#ffffff12'; e.currentTarget.style.background = 'linear-gradient(145deg, #ffffff08, #ffffff04)' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #00d4ff44, transparent)', transform: 'scaleX(0)', transition: 'transform 0.4s', transformOrigin: 'left' }}
                    ref={el => { if (el) { const parent = el.parentElement; parent.addEventListener('mouseenter', () => el.style.transform = 'scaleX(1)'); parent.addEventListener('mouseleave', () => el.style.transform = 'scaleX(0)') } }} />
                  <div style={{ fontSize: 32, marginBottom: 16 }}>{f.icon}</div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
                  <p style={{ color: '#888', fontSize: 14, lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: '40px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, maxWidth: 960, margin: '0 auto' }}>
            {[
              { icon: '⚽', title: 'World Cup 2026', desc: 'All matches live, highlights & replays in 4K HDR' },
              { icon: '🎬', title: '10K+ Movies', desc: 'On-demand library across every genre imaginable' },
              { icon: '📺', title: '5K+ Series', desc: 'Full seasons & new episodes added daily' },
            ].map(c => (
              <FadeSection key={c.title}>
                <div style={{ textAlign: 'center', padding: '36px 20px', background: 'linear-gradient(145deg, #ffffff08, #ffffff04)', border: '1px solid #ffffff12', borderRadius: 16, transition: 'all 0.3s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#00d4ff08'; e.currentTarget.style.borderColor = '#00d4ff33'; e.currentTarget.style.transform = 'translateY(-4px)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(145deg, #ffffff08, #ffffff04)'; e.currentTarget.style.borderColor = '#ffffff12'; e.currentTarget.style.transform = '' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>{c.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{c.title}</div>
                  <div style={{ color: '#888', fontSize: 14 }}>{c.desc}</div>
                </div>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: '40px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20, maxWidth: 900, margin: '0 auto' }}>
            {[{ num: '25K+', lbl: 'Channels Worldwide' }, { num: '50K+', lbl: 'Happy Customers' }, { num: '99.9%', lbl: 'Service Uptime' }, { num: '5K+', lbl: '4K Channels' }, { num: '10K+', lbl: 'Movies & Series' }].map(s => (
              <FadeSection key={s.lbl}>
                <div style={{ textAlign: 'center', padding: '32px 20px', background: 'linear-gradient(145deg, #ffffff06, #ffffff02)', border: '1px solid #ffffff10', borderRadius: 16, transition: 'all 0.3s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#ffffff08'; e.currentTarget.style.borderColor = '#ffffff20' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(145deg, #ffffff06, #ffffff02)'; e.currentTarget.style.borderColor = '#ffffff10' }}>
                  <div style={{ fontSize: 36, fontWeight: 800, color: '#00d4ff' }}>{s.num}</div>
                  <div style={{ color: '#666', fontSize: 13, marginTop: 6 }}>{s.lbl}</div>
                </div>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      <section id="plans" style={{ padding: '80px 24px', background: 'linear-gradient(180deg, #0a0a0a, #0f0f0f, #0a0a0a)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center' }}><span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 20, background: '#00d4ff10', color: '#00d4ff', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>Pricing</span></div>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.5rem)', fontWeight: 800, textAlign: 'center', marginBottom: 12 }}>Choose Your Plan</h2>
          <p style={{ textAlign: 'center', color: '#666', fontSize: 15, maxWidth: 600, margin: '0 auto 32px' }}>All plans include 24/7 support and a 7-day money-back guarantee.</p>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
            <div style={{ display: 'flex', background: '#ffffff08', borderRadius: 50, padding: 3, gap: 2 }}>
              <button onClick={() => setPlanInterval('month')} style={{
                padding: '8px 22px', borderRadius: 50, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                background: planInterval === 'month' ? '#00d4ff' : 'transparent',
                color: planInterval === 'month' ? '#000' : '#666',
                transition: 'all 0.2s',
              }}>Monthly</button>
              <button onClick={() => setPlanInterval('year')} style={{
                padding: '8px 22px', borderRadius: 50, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                background: planInterval === 'year' ? '#00d4ff' : 'transparent',
                color: planInterval === 'year' ? '#000' : '#666',
                transition: 'all 0.2s',
              }}>Yearly <span style={{ fontSize: 10, opacity: 0.8 }}>(Save 20%)</span></button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 24, maxWidth: 1000, margin: '0 auto' }}>
            {plans.filter(p => p.plan_type !== 'trial').slice(0, 6).map((plan, i) => {
              const popular = isPopular(plan)
              const avgPrice = plans.filter(p => p.plan_type !== 'trial').reduce((s, p) => s + (p.price_sell || 0), 0) / plans.filter(p => p.plan_type !== 'trial').length
              const cheapest = (plan.price_sell || 0) <= avgPrice * 0.7
              return (
                <FadeSection key={plan.id}>
                  <div style={{
                    background: popular ? 'linear-gradient(145deg, #00d4ff08, #00d4ff04)' : 'linear-gradient(145deg, #ffffff08, #ffffff04)',
                    border: popular ? '1px solid #00d4ff44' : '1px solid #ffffff15',
                    borderRadius: 20, padding: '36px 28px', textAlign: 'center',
                    transition: 'all 0.4s', position: 'relative',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-8px)'; if (!popular) e.currentTarget.style.borderColor = '#ffffff25' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; if (!popular) e.currentTarget.style.borderColor = '#ffffff15' }}>
                    {popular && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#00d4ff', color: '#000', padding: '4px 20px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>Most Popular</div>}
                    {cheapest && !popular && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#00ff8844', color: '#00ff88', padding: '4px 20px', borderRadius: 20, fontSize: 12, fontWeight: 700, border: '1px solid #00ff8844' }}>Best Value</div>}
                    <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{plan.plan_name}</div>
                    <div style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>{plan.provider_name} — {plan.specialty || 'General'}</div>
                    <div style={{ fontSize: 42, fontWeight: 800, color: '#fff' }}>
                      ${getPlanPrice(plan)}
                      <span style={{ fontSize: 16, color: '#666', fontWeight: 400 }}> {getPlanLabel(plan)}</span>
                    </div>
                    <ul style={{ listStyle: 'none', margin: '24px 0', padding: 0, textAlign: 'left' }}>
                      <li style={{ padding: '10px 0', borderBottom: '1px solid #ffffff08', color: '#aaa', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ color: '#00d4ff', fontWeight: 700 }}>✓</span> {plan.channels?.toLocaleString() || '?'} live channels
                      </li>
                      <li style={{ padding: '10px 0', borderBottom: '1px solid #ffffff08', color: '#aaa', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ color: '#00d4ff', fontWeight: 700 }}>✓</span> {plan.streams} simultaneous stream{plan.streams > 1 ? 's' : ''}
                      </li>
                      <li style={{ padding: '10px 0', borderBottom: '1px solid #ffffff08', color: '#aaa', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ color: '#00d4ff', fontWeight: 700 }}>✓</span> Full 4K HDR quality
                      </li>
                      <li style={{ padding: '10px 0', color: '#aaa', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ color: '#00d4ff', fontWeight: 700 }}>✓</span> {popular ? 'Priority support' : 'Email support'}
                      </li>
                    </ul>
                    <button onClick={() => handleBuyNow(plan)}
                      style={{
                        display: 'block', width: '100%', padding: 14, borderRadius: 50, border: 'none', fontWeight: 700,
                        fontSize: 15, cursor: 'pointer', transition: 'all 0.3s', marginTop: 16,
                        background: popular ? '#00d4ff' : 'transparent',
                        color: popular ? '#000' : '#fff',
                        border: popular ? 'none' : '1.5px solid #ffffff33',
                      }}
                      onMouseEnter={e => {
                        if (popular) { e.target.style.boxShadow = '0 4px 20px #00d4ff44'; e.target.style.transform = 'translateY(-2px)' }
                        else { e.target.style.borderColor = '#00d4ff'; e.target.style.color = '#00d4ff' }
                      }}
                      onMouseLeave={e => {
                        if (popular) { e.target.style.boxShadow = ''; e.target.style.transform = '' }
                        else { e.target.style.borderColor = '#ffffff33'; e.target.style.color = '#fff' }
                      }}>
                      {popular ? 'Subscribe Now' : cheapest ? 'Best Value' : 'Get Started'}
                    </button>
                  </div>
                </FadeSection>
              )
            })}
          </div>
        </div>
      </section>

      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center' }}><span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 20, background: '#00d4ff10', color: '#00d4ff', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>Testimonials</span></div>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.5rem)', fontWeight: 800, textAlign: 'center', marginBottom: 12 }}>What Our Customers Say</h2>
          <p style={{ textAlign: 'center', color: '#666', fontSize: 15, maxWidth: 600, margin: '0 auto 48px' }}>Join thousands of satisfied viewers who made the switch to premium IPTV.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {testimonials.map(t => (
              <FadeSection key={t.name}>
                <div style={{ background: 'linear-gradient(145deg, #ffffff08, #ffffff04)', border: '1px solid #ffffff12', borderRadius: 16, padding: 28, transition: 'all 0.3s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#ffffff22' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = '#ffffff12' }}>
                  <div style={{ color: '#ffaa00', fontSize: 14, marginBottom: 12 }}>★★★★★</div>
                  <p style={{ color: '#ccc', fontSize: 14, lineHeight: 1.7, marginBottom: 16, fontStyle: 'italic' }}>"{t.quote}"</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #00d4ff, #00ff88)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#000' }}>{t.initials}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>{t.title}</div>
                    </div>
                  </div>
                </div>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" style={{ padding: '40px 24px 80px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ textAlign: 'center' }}><span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 20, background: '#00d4ff10', color: '#00d4ff', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>FAQ</span></div>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.5rem)', fontWeight: 800, textAlign: 'center', marginBottom: 12 }}>Frequently Asked Questions</h2>
          <p style={{ textAlign: 'center', color: '#666', fontSize: 15, maxWidth: 600, margin: '0 auto 32px' }}>Everything you need to know before getting started.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {faqs.map((faq, i) => (
              <div key={i} onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{
                background: '#ffffff08', border: openFaq === i ? '1px solid #00d4ff33' : '1px solid #ffffff12',
                borderRadius: 12, overflow: 'hidden', transition: 'all 0.3s', cursor: 'pointer',
              }}>
                <div style={{ padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, fontSize: 15, color: openFaq === i ? '#fff' : '#ddd', userSelect: 'none' }}>
                  {faq.q}
                  <span style={{ fontSize: 18, color: openFaq === i ? '#00d4ff' : '#666', transition: 'transform 0.3s', transform: openFaq === i ? 'rotate(45deg)' : 'none', flexShrink: 0 }}>+</span>
                </div>
                <div style={{
                  padding: openFaq === i ? '0 20px 18px' : '0 20px',
                  maxHeight: openFaq === i ? 300 : 0,
                  overflow: 'hidden',
                  transition: 'all 0.3s',
                  color: '#888',
                  fontSize: 14,
                  lineHeight: 1.7,
                }}>
                  {faq.a}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: '20px 24px 80px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <FadeSection>
            <div style={{
              background: 'linear-gradient(135deg, #00d4ff10, #00ff8810)', border: '1px solid #00d4ff22',
              borderRadius: 24, padding: '60px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', background: 'radial-gradient(circle at 50% 50%, #00d4ff08, transparent 60%)', animation: 'pulse-soft 4s ease-in-out infinite' }} />
              <h2 style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2.2rem)', fontWeight: 800, marginBottom: 12, position: 'relative', zIndex: 1 }}>Ready to Start Watching?</h2>
              <p style={{ color: '#999', marginBottom: 28, position: 'relative', zIndex: 1 }}>Join 50,000+ satisfied customers. Start your free trial today — no commitment, no risk.</p>
              <button onClick={() => window.__showTrialForm?.()} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 36px', background: '#00d4ff',
                color: '#000', borderRadius: 50, fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer',
                transition: 'all 0.3s', position: 'relative', zIndex: 1,
              }}
                onMouseEnter={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 8px 30px #00d4ff44' }}
                onMouseLeave={e => { e.target.style.transform = ''; e.target.style.boxShadow = '' }}>
                ▶ Start Free Trial
              </button>
            </div>
          </FadeSection>
        </div>
      </section>

      <footer style={{ background: '#080808', borderTop: '1px solid #ffffff08', padding: '60px 24px 30px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 40, marginBottom: 40 }}>
            <div>
              <h4 style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>{siteName}</h4>
              <p style={{ color: '#666', fontSize: 14, lineHeight: 1.7 }}>Premium IPTV streaming with 25,000+ channels, 4K quality, and instant activation.</p>
            </div>
            <div>
              <h4 style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>Quick Links</h4>
              {['Features', 'Plans', 'FAQ', 'Free Trial'].map(l => (
                <a key={l} href={`#${l.toLowerCase().replace(' ', '')}`} onClick={e => { e.preventDefault(); document.querySelector(`#${l.toLowerCase().replace(' ', '')}`)?.scrollIntoView({ behavior: 'smooth' }) }}
                  style={{ display: 'block', color: '#666', textDecoration: 'none', fontSize: 14, padding: '4px 0', transition: 'color 0.3s' }}
                  onMouseEnter={e => e.target.style.color = '#00d4ff'}
                  onMouseLeave={e => e.target.style.color = '#666'}>{l}</a>
              ))}
            </div>
            <div>
              <h4 style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>Support</h4>
              <a href="mailto:support@iptvboss.com" style={{ display: 'block', color: '#666', textDecoration: 'none', fontSize: 14, padding: '4px 0', transition: 'color 0.3s' }}
                onMouseEnter={e => e.target.style.color = '#00d4ff'}
                onMouseLeave={e => e.target.style.color = '#666'}>Email Us</a>
              <a href="/" style={{ display: 'block', color: '#666', textDecoration: 'none', fontSize: 14, padding: '4px 0', transition: 'color 0.3s' }}
                onMouseEnter={e => e.target.style.color = '#00d4ff'}
                onMouseLeave={e => e.target.style.color = '#666'}>Live Chat</a>
              <a href="/" style={{ display: 'block', color: '#666', textDecoration: 'none', fontSize: 14, padding: '4px 0', transition: 'color 0.3s' }}
                onMouseEnter={e => e.target.style.color = '#00d4ff'}
                onMouseLeave={e => e.target.style.color = '#666'}>Help Center</a>
            </div>
            <div>
              <h4 style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>Legal</h4>
              {['terms', 'privacy', 'refund'].map(k => (
                <button key={k} onClick={() => setModal(k)} style={{ display: 'block', background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: 14, padding: '4px 0', textAlign: 'left', transition: 'color 0.3s' }}
                  onMouseEnter={e => e.target.style.color = '#00d4ff'}
                  onMouseLeave={e => e.target.style.color = '#666'}>
                  {k === 'terms' ? 'Terms of Service' : k === 'privacy' ? 'Privacy Policy' : 'Refund Policy'}
                </button>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid #ffffff08', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ color: '#555', fontSize: 13 }}>© {new Date().getFullYear()} {siteName}. All rights reserved.</span>
            <div style={{ display: 'flex', gap: 12 }}>
              {['𝕏', '📺', '💬'].map((s, i) => (
                <a key={i} href="#" style={{ width: 36, height: 36, borderRadius: '50%', background: '#ffffff08', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: '#666', fontSize: 16, transition: 'all 0.3s' }}
                  onMouseEnter={e => { e.target.style.background = '#00d4ff20'; e.target.style.color = '#00d4ff' }}
                  onMouseLeave={e => { e.target.style.background = '#ffffff08'; e.target.style.color = '#666' }}>{s}</a>
              ))}
            </div>
            <span style={{ color: '#555', fontSize: 13 }}>Powered by secure payments</span>
          </div>
        </div>
      </footer>

      {checkoutPlan && (
        <CheckoutModal plan={checkoutPlan} onClose={() => setCheckoutPlan(null)} userToken={localStorage.getItem('user_token')} />
      )}
      {showAuth && (
        <AuthModal settings={settings} onAuth={handleAuth} onClose={() => setShowAuth(false)} />
      )}
      <ChatWidget />

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 16, padding: 32, maxWidth: 500, width: '90%', position: 'relative' }}>
            <button onClick={() => setModal(null)} style={{ position: 'absolute', top: 12, right: 16, background: 'transparent', border: 'none', color: '#a0a0a0', cursor: 'pointer', fontSize: 20 }}>✕</button>
            <h2 style={{ margin: '0 0 16px', fontSize: 20, color: '#00d4ff' }}>{modalContent[modal].title}</h2>
            <p style={{ color: '#a0a0a0', fontSize: 14, lineHeight: 1.7, margin: 0 }}>{modalContent[modal].body}</p>
          </div>
        </div>
      )}
    </div>
  )
}
