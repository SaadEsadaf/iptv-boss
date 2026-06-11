import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import api from '../api'

const FR = {
  title: 'Mes Identifiants',
  subtitle: 'Utilisez ces informations pour commencer à regarder immédiatement',
  loading: 'Chargement de vos identifiants...',
  notFound: 'Lien invalide ou expiré',
  credentials: 'Identifiants de Connexion',
  username: 'Utilisateur',
  password: 'Mot de passe',
  server: 'Serveur',
  portal: 'Portail Client',
  m3uUrl: 'URL M3U',
  copy: 'Copier',
  copied: 'Copié !',
  setup: 'Configuration par Appareil',
  setupTitle: 'Guide d\'installation',
  selectDevice: 'Sélectionnez votre appareil pour voir les instructions',
  plan: 'Offre',
  status: 'Statut',
  active: 'Actif',
  expires: 'Expire le',
  needHelp: 'Besoin d\'aide ?',
  contactUs: 'Contactez-nous par WhatsApp',
  upgrade: 'Passer Premium',
  instructions: {
    tivimate: 'Téléchargez TiviMate → Ajoutez playlist M3U → Collez l\'URL ci-dessus',
    iptvsmarters: 'Ouvrez IPTV Smarters → Connexion Xtream → Entrez serveur, utilisateur, mot de passe',
    vlc: 'VLC → Media → Open Network Stream → Collez l\'URL M3U',
    mag: 'Paramètres → Portail → Entrez l\'URL du portail → Redémarrez',
    gse: 'GSE → Remote Playlists → Add M3U URL → Collez l\'URL',
    smarttv: 'Installez IPTV Smarters depuis l\'App Store → Entrez vos identifiants',
  },
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      style={{
        background: copied ? '#00ff8820' : '#ffffff10',
        border: `1px solid ${copied ? '#00ff8844' : '#ffffff15'}`,
        borderRadius: 8, padding: '6px 14px', color: copied ? '#00ff88' : '#8888aa',
        cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.3s', fontFamily: 'inherit',
      }}
    >
      {copied ? '✅ Copié !' : '📋 Copier'}
    </button>
  )
}

function DeviceGuide({ device, guide, t }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ border: '1px solid #ffffff10', borderRadius: 12, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', padding: '14px 18px', background: 'transparent', border: 'none',
          color: '#fff', cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
        }}
      >
        <span>{guide.icon} {guide.name}</span>
        <span style={{ transform: `rotate(${open ? 180 : 0}deg)`, transition: 'transform 0.3s', fontSize: 12 }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: '0 18px 18px' }}>
          <ol style={{ margin: 0, paddingLeft: 20, color: '#a0a0a0', fontSize: 13, lineHeight: 2 }}>
            {guide.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </div>
      )}
    </div>
  )
}

export default function ActivationPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || searchParams.get('order')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const t = FR

  useEffect(() => {
    if (!token) { setLoading(false); setError('No token provided'); return }
    api.get(`/activation/${encodeURIComponent(token)}`)
      .then(r => { setData(r.data); setLoading(false) })
      .catch(e => { setError(e.response?.data?.error || 'Not found'); setLoading(false) })
  }, [token])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8888aa', fontFamily: 'system-ui' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>⏳</div>
          <div>{t.loading}</div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff4444', fontFamily: 'system-ui' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
          <h2 style={{ color: '#fff', margin: '0 0 8px' }}>{t.notFound}</h2>
          <p style={{ color: '#8888aa', fontSize: 14 }}>{error}</p>
        </div>
      </div>
    )
  }

  const { credentials, guides, plan, status, expires, provider } = data

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: 'system-ui', color: '#fff', padding: '40px 20px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px', background: 'linear-gradient(135deg, #00d4ff, #ff6b35)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {t.title}
          </h1>
          <p style={{ color: '#8888aa', fontSize: 14, margin: 0 }}>{t.subtitle}</p>
        </div>

        {/* Status Badge */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 30, flexWrap: 'wrap' }}>
          {plan && <span style={{ background: '#ffffff08', padding: '8px 16px', borderRadius: 20, fontSize: 13, color: '#a0a0a0' }}>{t.plan}: <strong style={{ color: '#fff' }}>{plan}</strong></span>}
          <span style={{ background: status === 'used' || status === 'paid' ? '#00ff8820' : '#ff6b3520', padding: '8px 16px', borderRadius: 20, fontSize: 13, color: status === 'used' || status === 'paid' ? '#00ff88' : '#ff6b35' }}>
            {t.status}: <strong>{status === 'used' || status === 'paid' ? t.active : status}</strong>
          </span>
          {expires && <span style={{ background: '#ffffff08', padding: '8px 16px', borderRadius: 20, fontSize: 13, color: '#a0a0a0' }}>{t.expires}: <strong style={{ color: '#fff' }}>{new Date(expires).toLocaleDateString()}</strong></span>}
        </div>

        {/* Credentials Card */}
        <div style={{ background: '#141420', border: '1px solid #ffffff10', borderRadius: 16, padding: 28, marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 20px', color: '#00d4ff' }}>🔑 {t.credentials}</h2>
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ background: '#0a0a0f', borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ color: '#8888aa', fontSize: 13 }}>{t.username}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 15, color: '#fff', fontWeight: 600 }}>{credentials.username}</span>
                <CopyButton text={credentials.username} />
              </div>
            </div>
            <div style={{ background: '#0a0a0f', borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ color: '#8888aa', fontSize: 13 }}>{t.password}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 15, color: '#fff', fontWeight: 600 }}>{credentials.password}</span>
                <CopyButton text={credentials.password} />
              </div>
            </div>
            <div style={{ background: '#0a0a0f', borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ color: '#8888aa', fontSize: 13 }}>{t.m3uUrl}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: '60%' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#00d4ff', wordBreak: 'break-all', lineHeight: 1.4 }}>{credentials.m3u_url}</span>
                <CopyButton text={credentials.m3u_url} />
              </div>
            </div>
            <div style={{ background: '#0a0a0f', borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ color: '#8888aa', fontSize: 13 }}>{t.portal}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <a href={credentials.portal_url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'monospace', fontSize: 13, color: '#00d4ff', textDecoration: 'underline' }}>
                  {credentials.portal_url}
                </a>
                <CopyButton text={credentials.portal_url} />
              </div>
            </div>
          </div>
        </div>

        {/* Setup Guides */}
        <div style={{ background: '#141420', border: '1px solid #ffffff10', borderRadius: 16, padding: 28, marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: '#ff6b35' }}>📖 {t.setupTitle}</h2>
          <p style={{ color: '#8888aa', fontSize: 13, margin: '0 0 18px' }}>{t.selectDevice}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(guides).map(([key, guide]) => (
              <DeviceGuide key={key} device={key} guide={guide} t={t} />
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <div style={{ marginBottom: 16 }}>
            <p style={{ color: '#8888aa', fontSize: 13, margin: '0 0 4px' }}>{t.needHelp}</p>
            <a href="https://wa.me/212612345678" target="_blank" rel="noopener noreferrer" style={{ color: '#00d4ff', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
              {t.contactUs} 📱
            </a>
          </div>
          <a href="/#plans" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #00d4ff, #0090ff)', color: '#000', padding: '14px 36px', borderRadius: 12, textDecoration: 'none', fontWeight: 700, fontSize: 15 }}>
            {t.upgrade} 💳
          </a>
        </div>

      </div>
    </div>
  )
}
