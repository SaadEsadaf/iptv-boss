import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

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
  const [search, setSearch] = useState('')
  const [openFaq, setOpenFaq] = useState(null)

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
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
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
          </div>
        </div>
      </div>

      <footer style={{ borderTop: '1px solid #ffffff10', padding: '24px', textAlign: 'center', color: '#666', fontSize: 13 }}>
        © 2026 LuxStream. Tous droits réservés.
      </footer>
    </div>
  )
}
