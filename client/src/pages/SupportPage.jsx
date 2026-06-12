import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api'

const ws = typeof window !== 'undefined' && window.__WEBSITE__
const lang = ws?.language || 'fr'

const FR = {
  title: 'Centre d\'Aide & Support Technique',
  subtitle: 'Trouvez des solutions à vos problèmes, guides d\'installation, et téléchargements d\'applications.',
  searchPlaceholder: 'Rechercher un problème, une appli, un guide...',
  noResults: 'Aucun résultat trouvé. Essayez d\'autres mots-clés.',
  popular: 'Questions fréquentes',
  guides: 'Guides d\'installation par appareil',
  apps: 'Téléchargements d\'applications',
  contact: 'Vous n\'avez pas trouvé ? Contactez-nous',
  contactDesc: 'Notre équipe est disponible 7j/7 pour vous aider.',
  whatsapp: 'WhatsApp',
  email: 'Nous écrire',
  home: 'Accueil',
  blog: 'Blog',
  downloads: 'Téléchargements',
  support: 'Support',
  freeTrial: 'Essai Gratuit',
  signIn: 'Connexion',
  tickets: 'Mes Tickets',
  createTicket: 'Créer un ticket',
  ticketSubject: 'Sujet',
  ticketMessage: 'Message',
  ticketSubmit: 'Envoyer',
  ticketSent: 'Ticket envoyé !',
  ticketGuest: 'Continuer en tant qu\'invité',
  ticketLogin: 'Je suis client',
  yourPlans: 'Mes abonnements',
  relatedOrder: 'Commande liée (optionnel)',
  noTickets: 'Aucun ticket pour le moment',
  replyHere: 'Réponse du support',
  viewTickets: 'Voir mes tickets',
}

const t = (key) => lang === 'fr' ? (FR[key] || key) : key

const FAQ = [
  {
    q: 'Comment installer Atlas Pro ONTV sur Firestick ?',
    a: '1. Allez dans Paramètres → Mon Fire TV → Options pour les développeurs → activer "Applications provenant de sources inconnues"\n2. Installez "Downloader" depuis l\'Amazon App Store\n3. Ouvrez Downloader, entrez l\'URL de l\'APK Atlas Pro ONTV\n4. Installez et ouvrez l\'application\n5. Entrez votre code d\'activation reçu par email',
  },
  {
    q: 'Comment utiliser mes identifiants Xtream Codes ?',
    a: '1. Installez TiviMate, IPTV Smarters ou VLC\n2. Choisissez "Xtream Codes API" (pas M3U)\n3. Entrez :\n   - Serveur : l\'URL du serveur (ex: http://appley.site)\n   - Utilisateur : votre nom d\'utilisateur\n   - Mot de passe : votre mot de passe\n4. Validez et attendez le chargement des chaînes (10-30s)',
  },
  {
    q: 'Que faire si les chaînes s\'arrêtent / freeze ?',
    a: '1. Augmentez le buffer dans les paramètres du lecteur (Taille large 5MB)\n2. Passez en décodage Hardware → Software (ou inversement)\n3. Utilisez un câble Ethernet au lieu du WiFi\n4. Essayez un VPN (Free, Orange, SFR bloquent parfois l\'IPTV)\n5. Changez de DNS (Google 8.8.8.8 ou Cloudflare 1.1.1.1)',
  },
  {
    q: 'Pourquoi je vois "401 Unauthorized" ?',
    a: 'Cela signifie que vos identifiants sont incorrects ou que votre abonnement a expiré.\n- Vérifiez que vous avez copié le bon nom d\'utilisateur et mot de passe\n- Vérifiez que l\'URL du serveur ne contient pas http:// devant (sauf si demandé)\n- Contactez le support si le problème persiste',
  },
  {
    q: 'Comment installer sur iPhone / iPad ?',
    a: '1. Téléchargez "GSE Smart IPTV" ou "Atlas Pro IPTV Ontv GSE" depuis l\'App Store\n2. Ouvrez l\'app, allez dans Paramètres → "Allow HTTP" (activez-le)\n3. Ajoutez votre playlist : Remote Playlists → Add → M3U URL ou Xtream Codes\n4. Collez votre URL ou entrez vos identifiants\n5. Les chaînes se chargeront automatiquement',
  },
  {
    q: 'Combien d\'appareils puis-je utiliser ?',
    a: 'Cela dépend de votre forfait :\n- Basic (9.99€/mois) : 1 écran\n- Premium (14.99€/mois) : 2 écrans simultanés\n- Premium 3 Mois (29.99€) : 4 écrans\n- Semestre 6 Mois (49.99€) : 4 écrans\n- Annuel 12 Mois (69.99€) : 4 écrans',
  },
  {
    q: 'Ma box MAG ne fonctionne pas, que faire ?',
    a: '1. Vérifiez l\'URL du portail dans Paramètres → Serveurs → Portal URL\n2. Elle doit ressembler à : http://appley.site/c/\n3. Redémarrez la box après avoir entré l\'URL\n4. Vérifiez que l\'adresse MAC est bien enregistrée chez votre fournisseur',
  },
  {
    q: 'Comment obtenir mon code d\'activation ?',
    a: 'Après avoir souscrit à un forfait :\n1. Vous recevrez un email avec votre code d\'activation\n2. Ouvrez l\'application Atlas Pro ONTV\n3. Entrez le code dans le champ "Activation Code"\n4. Cliquez sur "Connexion" — les chaînes se chargent automatiquement\n\nVous n\'avez pas reçu l\'email ? Vérifiez vos spams ou contactez le support.',
  },
]

const GUIDES = [
  { device: 'Amazon Fire TV / Firestick', icon: '🔥', apps: 'TiviMate, IPTV Smarters, Atlas Pro ONTV' },
  { device: 'Android TV / Google TV', icon: '📺', apps: 'TiviMate, OTT Navigator, IPTV Smarters, Atlas Pro ONTV' },
  { device: 'iPhone / iPad', icon: '📱', apps: 'GSE Smart IPTV, Atlas Pro IPTV Ontv GSE, IPTV Smarters' },
  { device: 'Apple TV', icon: '🍎', apps: 'GSE Smart IPTV, iSTB, Atlas Pro IPTV Ontv GSE' },
  { device: 'Samsung TV (Tizen)', icon: '🖥️', apps: 'Smart IPTV, IBO Player' },
  { device: 'LG TV (webOS)', icon: '🖥️', apps: 'SS IPTV, IPTV Smarters' },
  { device: 'PC Windows / Mac', icon: '💻', apps: 'VLC Media Player, IPTV Smarters' },
  { device: 'Box MAG / Formuler', icon: '📦', apps: 'MyTVOnline, Portail Stalker' },
]

const DOWNLOAD_APPS = [
  { name: 'Atlas Pro ONTV', icon: '📺', url: 'https://atlaspro.tv/atlas-pro-ontv.apk', tag: 'Android/Fire TV', color: '#00d4ff' },
  { name: 'Atlas Pro IPTV Ontv GSE', icon: '📱', url: 'https://apps.apple.com/app/atlas-pro-iptv-ontv-gse/id6740336953', tag: 'iOS/Apple TV', color: '#5856d6' },
  { name: 'TiviMate IPTV Player', icon: '🔥', url: 'https://play.google.com/store/apps/details?id=ar.tvplayer.tv', tag: 'Android TV', color: '#ff6b35' },
  { name: 'IPTV Smarters Pro', icon: '📡', url: 'https://play.google.com/store/apps/details?id=com.nst.iptvsmarters', tag: 'Tout support', color: '#7c3aed' },
  { name: 'GSE Smart IPTV', icon: '🍎', url: 'https://apps.apple.com/app/gse-smart-iptv/id1028738731', tag: 'iOS', color: '#af52de' },
  { name: 'VLC Media Player', icon: '▶️', url: 'https://www.videolan.org/vlc/', tag: 'PC/Mac', color: '#e53935' },
]

export default function SupportPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [openFaq, setOpenFaq] = useState(null)
  const [showTicketForm, setShowTicketForm] = useState(false)
  const [showMyTickets, setShowMyTickets] = useState(false)
  const [ticketMode, setTicketMode] = useState(null)
  const [ticketForm, setTicketForm] = useState({ name: '', email: '', subject: '', message: '', order_id: '' })
  const [ticketSent, setTicketSent] = useState(false)
  const [ticketLoading, setTicketLoading] = useState(false)
  const [tickets, setTickets] = useState([])
  const [orders, setOrders] = useState([])
  const [customerToken, setCustomerToken] = useState(localStorage.getItem('customer_token'))
  const [ticketView, setTicketView] = useState(null)
  const [ticketReply, setTicketReply] = useState('')

  const refParam = searchParams.get('ref')

  useEffect(() => {
    if (customerToken) {
      api.get('/account/profile').then(r => {
        if (r.data?.email) {
          setTicketForm(f => ({ ...f, name: r.data.name || '', email: r.data.email }))
        }
      }).catch(() => {})
      api.get('/account/orders?active=1').then(r => {
        if (r.data?.orders) setOrders(r.data.orders.filter(o => o.is_trial || o.status === 'completed'))
      }).catch(() => {})
    }
  }, [customerToken])

  useEffect(() => {
    if (refParam) {
      setShowTicketForm(false)
      setShowMyTickets(true)
      setTicketMode('auth')
      fetch(`/api/tickets/ref/${refParam}`).then(r => r.json()).then(d => {
        if (d.ticket) setTicketView(d)
      }).catch(() => {})
    }
  }, [refParam])

  useEffect(() => {
    if (showMyTickets && customerToken) {
      fetch(`/api/tickets?email=${encodeURIComponent(ticketForm.email || '')}`).then(r => r.json()).then(d => {
        if (d.tickets) setTickets(d.tickets)
      }).catch(() => {})
    }
  }, [showMyTickets, customerToken, ticketForm.email])

  const lowerSearch = search.toLowerCase()
  const filteredFaq = FAQ.filter(f =>
    !search.trim() || f.q.toLowerCase().includes(lowerSearch) || f.a.toLowerCase().includes(lowerSearch)
  )
  const filteredGuides = GUIDES.filter(g =>
    !search.trim() || g.device.toLowerCase().includes(lowerSearch) || g.apps.toLowerCase().includes(lowerSearch)
  )
  const filteredApps = DOWNLOAD_APPS.filter(a =>
    !search.trim() || a.name.toLowerCase().includes(lowerSearch) || a.tag.toLowerCase().includes(lowerSearch)
  )

  const hasResults = filteredFaq.length > 0 || filteredGuides.length > 0 || filteredApps.length > 0

  async function handleTicketSubmit(e) {
    e.preventDefault()
    setTicketLoading(true)
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ticketForm.name,
          email: ticketForm.email,
          subject: ticketForm.subject,
          message: ticketForm.message,
          order_id: ticketForm.order_id || undefined,
          user_token: customerToken,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setTicketSent(true)
        setTicketForm(f => ({ ...f, subject: '', message: '', order_id: '' }))
      } else {
        alert(data.error || 'Failed to create ticket')
      }
    } catch {
      alert('Network error')
    } finally {
      setTicketLoading(false)
    }
  }

  async function handleTicketReply(ticketId) {
    if (!ticketReply.trim()) return
    try {
      const res = await fetch(`/api/tickets/${ticketId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: ticketReply,
          author: ticketForm.name || ticketForm.email,
          author_email: ticketForm.email,
          is_admin: false,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setTicketReply('')
        const updated = await fetch(`/api/tickets/ref/${ticketView.ticket.ref_code}`).then(r => r.json())
        if (updated.ticket) setTicketView(updated)
      }
    } catch {}
  }

  function startTicket(mode) {
    setTicketMode(mode)
    setShowTicketForm(true)
    setShowMyTickets(false)
    setTicketSent(false)
    if (mode === 'guest') {
      setTicketForm(f => ({ ...f, name: '', email: '' }))
    }
  }

  async function loadMyTickets() {
    if (!customerToken) return
    setShowMyTickets(true)
    setShowTicketForm(false)
    setTicketView(null)
    const res = await fetch(`/api/tickets?email=${encodeURIComponent(ticketForm.email)}`).then(r => r.json())
    if (res?.tickets) setTickets(res.tickets)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050510', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, background: '#050510ee', backdropFilter: 'blur(20px)', borderBottom: '1px solid #ffffff10', zIndex: 100, padding: '0 20px' }}>
        <div style={{ maxWidth: 1300, margin: '0 auto', display: 'flex', alignItems: 'center', height: 68, gap: 32 }}>
          <div onClick={() => navigate('/')} style={{ fontSize: 24, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: 'linear-gradient(135deg, #ff6b35, #ff2d92)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: 28 }}>LUX</span>
            <span style={{ color: '#fff' }}>STREAM</span>
          </div>
          <div style={{ display: 'flex', gap: 20, flex: 1, justifyContent: 'center' }}>
            <a onClick={() => navigate('/')} style={{ color: '#8888aa', textDecoration: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = '#8888aa'}>{t('home')}</a>
            <a onClick={() => navigate('/blog')} style={{ color: '#8888aa', textDecoration: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = '#8888aa'}>Blog</a>
            <a style={{ color: '#00d4ff', textDecoration: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{t('support')}</a>
            <a onClick={() => navigate('/downloads')} style={{ color: '#8888aa', textDecoration: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = '#8888aa'}>{t('downloads')}</a>
          </div>
          <button onClick={() => navigate('/')} style={{ padding: '9px 24px', background: 'linear-gradient(135deg, #ff6b35, #ff2d92)', color: '#fff', border: 'none', borderRadius: 50, fontWeight: 700, cursor: 'pointer', fontSize: 13, boxShadow: '0 4px 20px #ff6b3533' }}>
            {t('freeTrial')}
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h1 style={{ fontSize: 34, fontWeight: 800, marginBottom: 8, background: 'linear-gradient(135deg, #00d4ff, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {t('title')}
          </h1>
          <p style={{ color: '#8888aa', fontSize: 15 }}>{t('subtitle')}</p>
        </div>

        <div style={{ position: 'relative', marginBottom: 40 }}>
          <span style={{ position: 'absolute', left: 16, top: 14, fontSize: 18 }}>🔍</span>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setOpenFaq(null) }}
            placeholder={t('searchPlaceholder')}
            style={{
              width: '100%', padding: '14px 14px 14px 48px', borderRadius: 12,
              border: '1px solid #ffffff15', background: '#0a0a1a',
              color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = '#00d4ff'}
            onBlur={e => e.target.style.borderColor = '#ffffff15'}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 12, top: 12, background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: 18, padding: 4 }}>
              ✕
            </button>
          )}
        </div>

        {!hasResults && search && (
          <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <p>{t('noResults')}</p>
          </div>
        )}

        {filteredFaq.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              ❓ {t('popular')}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredFaq.map((faq, i) => (
                <div key={i} style={{
                  background: '#0a0a1a', border: '1px solid #ffffff08', borderRadius: 12, overflow: 'hidden',
                  transition: 'all 0.2s',
                }}>
                  <div onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, fontSize: 14 }}>
                    {faq.q}
                    <span style={{ color: '#00d4ff', fontSize: 12, transition: 'transform 0.2s', transform: openFaq === i ? 'rotate(180deg)' : '' }}>
                      ▼
                    </span>
                  </div>
                  {openFaq === i && (
                    <div style={{ padding: '0 16px 14px', color: '#a0a0a0', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-line', borderTop: '1px solid #ffffff08', paddingTop: 12 }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredGuides.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              📖 {t('guides')}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
              {filteredGuides.map((g, i) => (
                <div key={i} style={{ background: '#0a0a1a', border: '1px solid #ffffff08', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{g.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{g.device}</div>
                  <div style={{ color: '#a0a0a0', fontSize: 12 }}>{g.apps}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredApps.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              📥 {t('apps')}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredApps.map((app, i) => (
                <a key={i} href={app.url} target="_blank" rel="noopener noreferrer" style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  background: '#0a0a1a', border: '1px solid #ffffff08', borderRadius: 10,
                  textDecoration: 'none', transition: 'all 0.2s',
                }}>
                  <div style={{ fontSize: 24 }}>{app.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{app.name}</div>
                    <div style={{ color: '#00d4ff', fontSize: 12 }}>{app.tag}</div>
                  </div>
                  <span style={{ color: '#00d4ff', fontSize: 18 }}>→</span>
                </a>
              ))}
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 48, padding: 32, background: '#0a0a1a', borderRadius: 16, border: '1px solid #ffffff10' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{t('contact')}</h3>
          <p style={{ color: '#a0a0a0', fontSize: 14, marginBottom: 20 }}>{t('contactDesc')}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="https://wa.me/212612345678" target="_blank" rel="noopener noreferrer" style={{
              padding: '12px 28px', background: '#25D366', color: '#fff', borderRadius: 50,
              textDecoration: 'none', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              💬 {t('whatsapp')}
            </a>
            <a href="mailto:support@dalletek.live" style={{
              padding: '12px 28px', background: '#00d4ff20', color: '#00d4ff', borderRadius: 50,
              textDecoration: 'none', fontWeight: 700, fontSize: 14, border: '1px solid #00d4ff40', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              ✉️ {t('email')}
            </a>
            <button onClick={() => setShowTicketForm(true)} style={{
              padding: '12px 28px', background: '#8b5cf6', color: '#fff', borderRadius: 50,
              border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              🎫 {t('createTicket')}
            </button>
            {customerToken && (
              <button onClick={loadMyTickets} style={{
                padding: '12px 28px', background: '#1a1a3e', color: '#00d4ff', borderRadius: 50,
                border: '1px solid #00d4ff40', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              }}>
                📋 {t('viewTickets')}
              </button>
            )}
          </div>
        </div>

        {/* Ticket Form */}
        {showTicketForm && (
          <div style={{ marginTop: 32, padding: 28, background: '#0a0a1a', borderRadius: 16, border: '1px solid #8b5cf630' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: '#8b5cf6' }}>🎫 {t('createTicket')}</h3>
              <button onClick={() => setShowTicketForm(false)} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>
            {!ticketSent ? (
              <>
                {!ticketMode && (
                  <div style={{ display: 'flex', gap: 12, marginBottom: 20, justifyContent: 'center' }}>
                    {customerToken ? (
                      <button onClick={() => { setTicketMode('auth'); setTicketForm(f => ({ ...f, name: '', email: '' })) }} style={{ padding: '12px 24px', background: '#00d4ff', color: '#000', borderRadius: 10, border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                        🔑 {t('ticketLogin')}
                      </button>
                    ) : (
                      <button onClick={() => { startTicket('guest'); setTicketForm(f => ({ ...f, name: '', email: '' })) }} style={{ padding: '12px 24px', background: '#0f0f0f', border: '1px solid #333', color: '#a0a0a0', borderRadius: 10, cursor: 'pointer', fontSize: 14 }}>
                        👤 {t('ticketGuest')}
                      </button>
                    )}
                  </div>
                )}
                {ticketMode && (
                  <form onSubmit={handleTicketSubmit}>
                    {ticketMode === 'guest' && (
                      <>
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ color: '#a0a0a0', fontSize: 12, display: 'block', marginBottom: 4 }}>Name</label>
                          <input value={ticketForm.name} onChange={e => setTicketForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name" required
                            style={{ width: '100%', padding: '10px 12px', background: '#0f0f0f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ color: '#a0a0a0', fontSize: 12, display: 'block', marginBottom: 4 }}>Email *</label>
                          <input value={ticketForm.email} onChange={e => setTicketForm(f => ({ ...f, email: e.target.value }))} placeholder="your@email.com" type="email" required
                            style={{ width: '100%', padding: '10px 12px', background: '#0f0f0f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                      </>
                    )}
                    {ticketMode === 'auth' && customerToken && (
                      <div style={{ marginBottom: 12, padding: 12, background: '#00d4ff10', borderRadius: 8, border: '1px solid #00d4ff30' }}>
                        <p style={{ color: '#00d4ff', fontSize: 13, margin: '0 0 4px' }}>👤 {ticketForm.name || ticketForm.email}</p>
                        {orders.length > 0 && (
                          <select value={ticketForm.order_id} onChange={e => setTicketForm(f => ({ ...f, order_id: e.target.value }))}
                            style={{ width: '100%', padding: '8px', background: '#0f0f0f', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 12, marginTop: 8 }}>
                            <option value="">{t('relatedOrder')}</option>
                            {orders.map(o => (
                              <option key={o.id} value={o.id}>{o.plan_name || o.provider_name} #{o.id} — {o.created_at}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ color: '#a0a0a0', fontSize: 12, display: 'block', marginBottom: 4 }}>{t('ticketSubject')} *</label>
                      <input value={ticketForm.subject} onChange={e => setTicketForm(f => ({ ...f, subject: e.target.value }))} placeholder="Brief description of your issue" required
                        style={{ width: '100%', padding: '10px 12px', background: '#0f0f0f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ color: '#a0a0a0', fontSize: 12, display: 'block', marginBottom: 4 }}>{t('ticketMessage')} *</label>
                      <textarea value={ticketForm.message} onChange={e => setTicketForm(f => ({ ...f, message: e.target.value }))} placeholder="Describe your issue in detail..." required rows={4}
                        style={{ width: '100%', padding: '10px 12px', background: '#0f0f0f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
                    </div>
                    <button type="submit" disabled={ticketLoading} style={{
                      width: '100%', padding: '12px', background: '#8b5cf6', color: '#fff', border: 'none',
                      borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14, opacity: ticketLoading ? 0.6 : 1,
                    }}>
                      {ticketLoading ? 'Sending...' : '🚀 ' + t('ticketSubmit')}
                    </button>
                  </form>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
                <p style={{ color: '#00cc66', fontWeight: 700, fontSize: 16 }}>{t('ticketSent')}</p>
                <p style={{ color: '#a0a0a0', fontSize: 13, marginTop: 8 }}>We'll get back to you at {ticketForm.email}</p>
                <button onClick={() => { setShowTicketForm(false); setTicketSent(false); setTicketMode(null) }} style={{ marginTop: 16, padding: '10px 24px', background: '#0f0f0f', border: '1px solid #333', color: '#a0a0a0', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
                  Close
                </button>
              </div>
            )}
          </div>
        )}

        {/* My Tickets */}
        {showMyTickets && (
          <div style={{ marginTop: 32 }}>
            <h3 style={{ fontSize: 18, marginBottom: 16 }}>📋 {t('tickets')}</h3>
            {!ticketView && (
              <>
                {tickets.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
                    <div style={{ fontSize: 48, marginBottom: 8 }}>🎫</div>
                    <p>{t('noTickets')}</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {tickets.map(t => (
                      <div key={t.id} onClick={() => fetch(`/api/tickets/${t.id}`).then(r => r.json()).then(d => setTicketView(d))}
                        style={{ background: '#0a0a1a', border: '1px solid #ffffff10', borderRadius: 12, padding: 16, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{t.subject}</div>
                          <div style={{ color: '#666', fontSize: 12 }}>#{t.ref_code} — {t.updated_at}</div>
                        </div>
                        <span style={{
                          background: t.status === 'open' ? '#00d4ff20' : t.status === 'pending' ? '#ffd70020' : '#ffffff10',
                          color: t.status === 'open' ? '#00d4ff' : t.status === 'pending' ? '#ffd700' : '#888',
                          padding: '3px 12px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                        }}>{t.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            {ticketView && (
              <div style={{ background: '#0a0a1a', border: '1px solid #ffffff10', borderRadius: 16, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: 16 }}>{ticketView.ticket.subject}</h4>
                    <p style={{ color: '#666', fontSize: 12, margin: 0 }}>#{ticketView.ticket.ref_code}</p>
                  </div>
                  <button onClick={() => setTicketView(null)} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: 18 }}>✕</button>
                </div>
                <div style={{ marginBottom: 16 }}>
                  {ticketView.messages.map(m => (
                    <div key={m.id} style={{
                      marginBottom: 12, padding: 12, borderRadius: 12,
                      background: m.is_admin ? '#8b5cf610' : '#0f0f0f',
                      border: `1px solid ${m.is_admin ? '#8b5cf630' : '#1a1a1a'}`,
                    }}>
                      <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>
                        {m.author} {m.is_admin ? '🛡️' : ''} — {m.created_at}
                      </div>
                      <div style={{ fontSize: 13, color: '#ccc', whiteSpace: 'pre-wrap' }}>{m.message}</div>
                    </div>
                  ))}
                </div>
                {ticketView.ticket.status !== 'closed' && (
                  <div>
                    <textarea value={ticketReply} onChange={e => setTicketReply(e.target.value)} placeholder={t('replyHere')} rows={2}
                      style={{ width: '100%', padding: '10px 12px', background: '#0f0f0f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
                    <button onClick={() => handleTicketReply(ticketView.ticket.id)} disabled={!ticketReply.trim()} style={{
                      marginTop: 8, padding: '10px 24px', background: '#8b5cf6', color: '#fff', border: 'none',
                      borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13, opacity: !ticketReply.trim() ? 0.5 : 1,
                    }}>
                      Send Reply
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <footer style={{ borderTop: '1px solid #ffffff10', padding: '24px', textAlign: 'center', color: '#666', fontSize: 13 }}>
        © 2026 LuxStream. Tous droits réservés.
      </footer>
    </div>
  )
}
