import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const ws = typeof window !== 'undefined' && window.__WEBSITE__
const lang = ws?.language || 'fr'

const FR = {
  title: 'Téléchargements',
  subtitle: 'Installez Atlas Pro IPTV sur tous vos appareils',
  official: 'Applications Officielles Atlas Pro',
  recommended: 'Recommandé — Interface optimisée',
  thirdParty: 'Applications Tiers (Xtream Codes)',
  thirdPartyDesc: 'Utilisez vos identifiants Xtream Codes (serveur, utilisateur, mot de passe)',
  setup: 'Voir le guide',
  download: 'Télécharger',
  or: 'ou',
  allPlatforms: 'Toutes les plateformes',
  atlasAndroid: 'Atlas Pro ONTV',
  atlasAndroidDesc: 'Application officielle pour Android TV, Fire TV, et boîtiers Android. Interface fluide, EPG intégré, multi-écrans.',
  atlasAndroidHow: '1. Téléchargez l\'APK\n2. Activez "Sources inconnues" sur votre appareil\n3. Installez et entrez votre code d\'activation',
  atlasIos: 'Atlas Pro IPTV Ontv GSE',
  atlasIosDesc: 'Application officielle pour iPhone, iPad et Apple TV. Design natif iOS, prise en charge tvOS.',
  atlasIosHow: '1. Installez depuis l\'App Store\n2. Ouvrez l\'application\n3. Entrez votre code d\'abonné actif',
  tivimate: 'TiviMate IPTV Player',
  tivimateDesc: 'Le meilleur lecteur IPTV pour Firestick et Android TV. Interface premium, EPG, favoris, zapping rapide.',
  tivimateHow: '1. Installez depuis l\'Amazon App Store ou Google Play\n2. Ajoutez votre playlist via Xtream Codes\n3. Profitez de la meilleure expérience IPTV',
  smarters: 'IPTV Smarters Pro',
  smartersDesc: 'Application universelle disponible sur toutes les plateformes. Simple, fiable, idéale pour débutants.',
  smartersHow: '1. Installez depuis votre store\n2. Connectez-vous avec Xtream Codes\n3. Accédez à vos chaînes, films et séries',
  gse: 'GSE Smart IPTV',
  gseDesc: 'Application de référence pour iPhone, iPad et Apple TV. Support M3U et Xtream Codes.',
  gseHow: '1. Installez depuis l\'App Store\n2. Activez "Allow HTTP" dans les réglages\n3. Ajoutez votre playlist M3U ou Xtream',
  vlc: 'VLC Media Player',
  vlcDesc: 'Lecteur universel pour PC et Mac. Idéal pour tester rapidement votre flux M3U.',
  vlcHow: '1. Installez VLC depuis videolan.org\n2. Ouvrez le flux réseau avec votre lien M3U\n3. Testez vos chaînes instantanément',
  smartIptv: 'Smart IPTV / IBO Player',
  smartIptvDesc: 'Pour TV Samsung (Tizen) et LG (webOS). Application légère avec support M3U.',
  smartIptvHow: '1. Installez depuis le Samsung/LG App Store\n2. Ajoutez votre M3U URL\n3. Patientez le chargement des chaînes',
  home: 'Accueil',
  atlas: 'Atlas Pro',
  downloads: 'Téléchargements',
  freeTrial: 'Essai Gratuit',
  signIn: 'Connexion',
}

const t = (key) => lang === 'fr' ? (FR[key] || key) : key

const APPS = [
  {
    id: 'atlas-android',
    icon: '📺',
    nameKey: 'atlasAndroid',
    descKey: 'atlasAndroidDesc',
    badge: 'official',
    badgeText: 'OFFICIEL',
    platforms: 'Android TV / Fire TV / Boîtiers Android',
    howKey: 'atlasAndroidHow',
    links: {
      apk: 'https://atlaspro.tv/atlas-pro-ontv.apk',
      amazon: 'https://www.amazon.com/dp/B0DPDZMGVL',
    },
    gradient: 'linear-gradient(135deg, #00d4ff, #0090ff)',
  },
  {
    id: 'atlas-ios',
    icon: '📱',
    nameKey: 'atlasIos',
    descKey: 'atlasIosDesc',
    badge: 'official',
    badgeText: 'OFFICIEL',
    platforms: 'iPhone / iPad / Apple TV',
    howKey: 'atlasIosHow',
    links: {
      appstore: 'https://apps.apple.com/app/atlas-pro-iptv-ontv-gse/id6740336953',
    },
    gradient: 'linear-gradient(135deg, #00d4ff, #0090ff)',
  },
  {
    id: 'tivimate',
    icon: '🔥',
    nameKey: 'tivimate',
    descKey: 'tivimateDesc',
    badge: 'premium',
    badgeText: '⭐ MEILLEUR',
    platforms: 'Fire TV / Android TV',
    howKey: 'tivimateHow',
    links: {
      amazon: 'https://www.amazon.com/dp/B07R8TK7ZZ',
      google: 'https://play.google.com/store/apps/details?id=ar.tvplayer.tv',
      guide: '/setup?app=tivimate',
    },
    gradient: 'linear-gradient(135deg, #ff6b35, #ff2d92)',
  },
  {
    id: 'smarters',
    icon: '📡',
    nameKey: 'smarters',
    descKey: 'smartersDesc',
    badge: 'popular',
    badgeText: 'POPULAIRE',
    platforms: 'Android / iOS / Fire TV / Smart TV / PC',
    howKey: 'smartersHow',
    links: {
      android: 'https://play.google.com/store/apps/details?id=com.nst.iptvsmarters',
      ios: 'https://apps.apple.com/app/iptv-smarters-pro/id1461049531',
      amazon: 'https://www.amazon.com/dp/B07ZQZP126',
    },
    gradient: 'linear-gradient(135deg, #7c3aed, #a855f7)',
  },
  {
    id: 'gse',
    icon: '🍎',
    nameKey: 'gse',
    descKey: 'gseDesc',
    platforms: 'iPhone / iPad / Apple TV',
    howKey: 'gseHow',
    links: {
      ios: 'https://apps.apple.com/app/gse-smart-iptv/id1028738731',
    },
    gradient: 'linear-gradient(135deg, #5856d6, #af52de)',
  },
  {
    id: 'vlc',
    icon: '🖥️',
    nameKey: 'vlc',
    descKey: 'vlcDesc',
    platforms: 'Windows / Mac / Linux',
    howKey: 'vlcHow',
    links: {
      windows: 'https://www.videolan.org/vlc/download-windows.html',
      mac: 'https://www.videolan.org/vlc/download-macos.html',
      linux: 'https://www.videolan.org/vlc/download-linux.html',
    },
    gradient: 'linear-gradient(135deg, #ff6b35, #e53935)',
  },
  {
    id: 'smart-iptv',
    icon: '🖥️',
    nameKey: 'smartIptv',
    descKey: 'smartIptvDesc',
    platforms: 'Samsung TV / LG TV',
    howKey: 'smartIptvHow',
    links: {
      samsung: 'https://www.samsung.com/apps',
      lg: 'https://www.lg.com/apps',
    },
    gradient: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
  },
]

export default function DownloadsPage() {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(null)

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
            <a onClick={() => navigate('/support')} style={{ color: '#8888aa', textDecoration: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = '#8888aa'}>Support</a>
            <a style={{ color: '#00d4ff', textDecoration: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{t('downloads')}</a>
          </div>
          <button onClick={() => navigate('/')} style={{ padding: '9px 24px', background: 'linear-gradient(135deg, #ff6b35, #ff2d92)', color: '#fff', border: 'none', borderRadius: 50, fontWeight: 700, cursor: 'pointer', fontSize: 13, boxShadow: '0 4px 20px #ff6b3533' }}>
            {t('freeTrial')}
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8, background: 'linear-gradient(135deg, #ff6b35, #ff2d92, #00d4ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {t('title')}
          </h1>
          <p style={{ color: '#8888aa', fontSize: 16 }}>{t('subtitle')}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {APPS.map((app, i) => (
            <div key={app.id} style={{
              background: 'linear-gradient(135deg, #0a1628, #1a1a2e)',
              border: '1px solid #ffffff10',
              borderRadius: 16, overflow: 'hidden', transition: 'all 0.3s',
              boxShadow: expanded === i ? `0 0 30px ${app.id.includes('atlas') ? 'rgba(0,212,255,0.15)' : 'rgba(255,107,53,0.1)'}` : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20, cursor: 'pointer' }}
                onClick={() => setExpanded(expanded === i ? null : i)}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: app.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, flexShrink: 0,
                }}>
                  {app.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>{t(app.nameKey)}</span>
                    {app.badge && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                        background: app.badge === 'official' ? '#00d4ff20' : app.badge === 'premium' ? '#ff6b3520' : '#7c3aed20',
                        color: app.badge === 'official' ? '#00d4ff' : app.badge === 'premium' ? '#ff6b35' : '#a855f7',
                      }}>
                        {app.badgeText}
                      </span>
                    )}
                  </div>
                  <div style={{ color: '#a0a0a0', fontSize: 13, marginBottom: 2 }}>{t(app.descKey)}</div>
                  <div style={{ color: '#666', fontSize: 11 }}>{app.platforms}</div>
                </div>
                <div style={{ fontSize: expanded === i ? 20 : 16, color: '#666', transition: 'transform 0.2s', transform: expanded === i ? 'rotate(180deg)' : '' }}>
                  ▼
                </div>
              </div>

              {expanded === i && (
                <div style={{ padding: '0 20px 20px', borderTop: '1px solid #ffffff10', margin: '0 20px' }}>
                  <div style={{ paddingTop: 16, whiteSpace: 'pre-line', color: '#a0a0a0', fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
                    {t(app.howKey)}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {Object.entries(app.links).map(([key, url]) => (
                      <a key={key} href={url} target="_blank" rel="noopener noreferrer" style={{
                        padding: '8px 18px', borderRadius: 8,
                        background: app.gradient, color: '#fff',
                        textDecoration: 'none', fontWeight: 700, fontSize: 13,
                        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                      }}>
                        {key === 'guide' ? t('setup') : t('download')} {key !== 'guide' && `→ ${key.toUpperCase()}`}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
            {t('thirdPartyDesc')}
          </p>
          <button onClick={() => navigate('/activate?token=guide')} style={{
            padding: '14px 36px',
            background: 'linear-gradient(135deg, #00d4ff, #0090ff)',
            color: '#fff', border: 'none', borderRadius: 50,
            fontWeight: 700, cursor: 'pointer', fontSize: 15,
            boxShadow: '0 4px 20px rgba(0,212,255,0.3)',
          }}>
            📖 Guide d'installation complet
          </button>
        </div>
      </div>

      <footer style={{ borderTop: '1px solid #ffffff10', padding: '24px', textAlign: 'center', color: '#666', fontSize: 13 }}>
        © 2026 LuxStream. Tous droits réservés.
      </footer>
    </div>
  )
}
