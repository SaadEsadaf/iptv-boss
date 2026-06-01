import { useState, useEffect } from 'react'
import api from '../api'
import AIAssistant from '../components/AIAssistant'
import Overview from '../components/AdminTabs/Overview'
import ProvidersTab from '../components/AdminTabs/Providers'
import Codes from '../components/AdminTabs/Codes'
import Trials from '../components/AdminTabs/Trials'
import Orders from '../components/AdminTabs/Orders'
import ChatSessions from '../components/AdminTabs/ChatSessions'
import Pages from '../components/AdminTabs/Pages'
import SEO from '../components/AdminTabs/SEO'
import AgentLog from '../components/AdminTabs/AgentLog'
import Settings from '../components/AdminTabs/Settings'
import EmailTemplates from '../components/AdminTabs/EmailTemplates'
import Websites from '../components/AdminTabs/Websites'
import DeployTargets from '../components/AdminTabs/DeployTargets'
import Domains from '../components/AdminTabs/Domains'
import SubAdmins from '../components/AdminTabs/SubAdmins'
const LOCALE = {
  en: {
    overview: 'Overview', providers: 'Providers', codes: 'Codes', trials: 'Trials',
    orders: 'Orders', chat: 'Chat', pages: 'Pages', seo: 'SEO',
    'agent-log': 'Agent Log', websites: 'Websites', servers: 'Servers',
    domains: 'Domains', 'subadmins': 'Sub-Admins', settings: 'Settings',
    admin: 'Admin Panel', select: 'Select Website', signOut: 'Sign Out', signIn: 'Sign In',
  },
  fr: {
    overview: 'Aperçu', providers: 'Fournisseurs', codes: 'Codes', trials: 'Essais',
    orders: 'Commandes', chat: 'Chat', pages: 'Pages', seo: 'SEO',
    'agent-log': 'Journal IA', websites: 'Sites', servers: 'Serveurs',
    domains: 'Domaines', 'subadmins': 'Sous-Admins', settings: 'Paramètres',
    admin: 'Panneau Admin', select: 'Choisir un site', signOut: 'Déconnexion', signIn: 'Connexion',
  },
  nl: {
    overview: 'Overzicht', providers: 'Aanbieders', codes: 'Codes', trials: 'Proeven',
    orders: 'Bestellingen', chat: 'Chat', pages: 'Pagina\'s', seo: 'SEO',
    'agent-log': 'AI Logboek', websites: 'Websites', servers: 'Servers',
    domains: 'Domeinen', 'subadmins': 'Sub-Admins', settings: 'Instellingen',
    admin: 'Admin Paneel', select: 'Selecteer website', signOut: 'Uitloggen', signIn: 'Inloggen',
  },
}

const allTabs = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'providers', label: 'Providers', icon: '📡' },
  { id: 'codes', label: 'Codes', icon: '🔑' },
  { id: 'trials', label: 'Trials', icon: '🧪' },
  { id: 'orders', label: 'Orders', icon: '📦' },
  { id: 'chat', label: 'Chat', icon: '💬' },
  { id: 'pages', label: 'Pages', icon: '📄' },
  { id: 'seo', label: 'SEO', icon: '🎯' },
  { id: 'agent-log', label: 'Agent Log', icon: '📋' },
  { id: 'websites', label: 'Websites', icon: '🌐' },
  { id: 'servers', label: 'Servers', icon: '🗄️' },
  { id: 'domains', label: 'Domains', icon: '🌐' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
  { id: 'emails', label: 'Emails', icon: '📧' },
  { id: 'subadmins', label: 'Sub-Admins', icon: '👥' },
]

export default function AdminDashboard() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [username, setUsername] = useState(localStorage.getItem('username') || '')
  const [role, setRole] = useState(localStorage.getItem('role') || '')
  const [perms, setPerms] = useState(() => {
    try { return JSON.parse(localStorage.getItem('admin_perms') || '[]') } catch { return [] }
  })
  const [activeTab, setActiveTab] = useState('overview')
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [websiteId, setWebsiteId] = useState(localStorage.getItem('admin_website_id') || '')
  const [websites, setWebsites] = useState([])
  const [lang, setLang] = useState('en')

  function t(key) { return (LOCALE[lang] || LOCALE.en)[key] || key }

  useEffect(() => {
    if (token) {
      api.get('/admin/me').then(r => {
        setRole(r.data.role || '')
        const p = r.data.permissions || []
        setPerms(p)
        localStorage.setItem('role', r.data.role || '')
        localStorage.setItem('admin_perms', JSON.stringify(p))
      }).catch(() => {})
      api.get('/admin/websites').then(r => setWebsites(r.data)).catch(() => {})
      api.get('/admin/settings').then(r => {
        const l = r.data.admin_language || 'en'
        setLang(l)
        document.documentElement.lang = l
      }).catch(() => {})
    }
  }, [token])

  function handleSelectWebsite(w) {
    const id = String(w.id)
    localStorage.setItem('admin_website_id', id)
    setWebsiteId(id)
    setActiveTab('overview')
    window.location.hash = 'overview'
  }

  const hash = window.location.hash.slice(1)
  useEffect(() => {
    if (allTabs.find(t => t.id === hash)) setActiveTab(hash)
  }, [hash])

  function handleLogin(e) {
    e.preventDefault()
    setLoginError('')
    api.post('/admin/login', loginForm).then(r => {
      localStorage.setItem('token', r.data.token)
      localStorage.setItem('username', r.data.username)
      localStorage.setItem('role', r.data.role || '')
      const permsData = r.data.role === 'super_admin' ? [] : (r.data.permissions || [])
      setPerms(permsData)
      localStorage.setItem('admin_perms', JSON.stringify(permsData))
      setToken(r.data.token)
      setUsername(r.data.username)
      setRole(r.data.role || '')
    }).catch(() => setLoginError('Invalid credentials'))
  }

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    localStorage.removeItem('role')
    localStorage.removeItem('admin_website_id')
    localStorage.removeItem('admin_perms')
    setToken(null)
    setUsername('')
    setRole('')
  }

  if (!token) {
    return (
      <div style={{ background: '#0f0f0f', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <form onSubmit={handleLogin} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 16, padding: 40, width: 360 }}>
          <h1 style={{ textAlign: 'center', color: '#00d4ff', marginBottom: 8 }}>IPTV Boss</h1>
          <p style={{ textAlign: 'center', color: '#666', marginBottom: 32 }}>{t('admin')}</p>
          {loginError && <p style={{ color: '#ff4444', marginBottom: 16, fontSize: 14 }}>{loginError}</p>}
          <input
            placeholder="Username" value={loginForm.username}
            onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))}
            style={{ width: '100%', padding: '12px 16px', marginBottom: 12, borderRadius: 8, border: '1px solid #2a2a2a', background: '#0f0f0f', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
          />
          <input
            type="password" placeholder="Password" value={loginForm.password}
            onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
            style={{ width: '100%', padding: '12px 16px', marginBottom: 24, borderRadius: 8, border: '1px solid #2a2a2a', background: '#0f0f0f', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
          />
          <button type="submit" style={{ width: '100%', padding: '12px', background: '#00d4ff', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
            {t('signIn')}
          </button>
        </form>
      </div>
    )
  }

  const isSuperAdmin = role === 'super_admin'
  const tabs = isSuperAdmin
    ? allTabs
    : perms.length
      ? allTabs.filter(t => t.id !== 'subadmins' && perms.includes(t.id))
      : allTabs.filter(t => t.id !== 'subadmins')
  const validTab = tabs.find(t => t.id === activeTab) ? activeTab : tabs[0]?.id || 'overview'

  const TabComponent = {
    overview: Overview,
    providers: ProvidersTab,
    codes: Codes,
    trials: Trials,
    orders: Orders,
    chat: ChatSessions,
    pages: Pages,
    seo: SEO,
    'agent-log': AgentLog,
    websites: () => <Websites onSelectWebsite={handleSelectWebsite} />,
    servers: DeployTargets,
    domains: Domains,
    settings: Settings,
    emails: EmailTemplates,
    subadmins: SubAdmins,
  }[validTab]

  const selectedWebsite = websites.find(w => String(w.id) === websiteId)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: 'Sora, system-ui, sans-serif' }}>
      <nav style={{ width: 220, background: '#1a1a1a', borderRight: '1px solid #2a2a2a', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #2a2a2a' }}>
          <h2 style={{ color: '#00d4ff', fontSize: 18, margin: 0 }}>IPTV Boss</h2>
          <p style={{ color: '#666', fontSize: 12, margin: '4px 0 0' }}>{username}</p>
        </div>
        {websites.length > 1 && (
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #2a2a2a' }}>
            <select
              value={websiteId}
              onChange={e => {
                const w = websites.find(x => String(x.id) === e.target.value)
                if (w) handleSelectWebsite(w)
              }}
              style={{
                width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #2a2a2a',
                background: '#0f0f0f', color: '#fff', fontSize: 13, outline: 'none', cursor: 'pointer',
              }}
            >
              {websites.map(w => (
                <option key={w.id} value={w.id}>{w.site_name || w.name}</option>
              ))}
            </select>
          </div>
        )}
        {!websiteId && websites.length > 0 && (
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #2a2a2a' }}>
            <button
              onClick={() => handleSelectWebsite(websites[0])}
              style={{
                width: '100%', padding: '6px 10px', background: '#00d4ff', color: '#000',
                border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
              }}
            >
                {t('select')}
              </button>
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); window.location.hash = tab.id }} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px',
              background: activeTab === tab.id ? '#2a2a2a' : 'transparent', color: activeTab === tab.id ? '#00d4ff' : '#a0a0a0',
              border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, textAlign: 'left', fontWeight: activeTab === tab.id ? 600 : 400,
            }}>
              <span>{tab.icon}</span>
              <span>{t(tab.id)}</span>
            </button>
          ))}
        </div>
        <div style={{ padding: '12px', borderTop: '1px solid #2a2a2a' }}>
          <button onClick={handleLogout} style={{ width: '100%', padding: '8px', background: 'transparent', color: '#a0a0a0', border: '1px solid #2a2a2a', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
            {t('signOut')}
          </button>
        </div>
      </nav>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ padding: '16px 24px', borderBottom: '1px solid #2a2a2a', background: '#1a1a1a', display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1 style={{ fontSize: 20, margin: 0 }}>{t(validTab)}</h1>
          {selectedWebsite && <span style={{ color: '#666', fontSize: 13, background: '#0f0f0f', padding: '4px 10px', borderRadius: 6 }}>{selectedWebsite.site_name || selectedWebsite.name}</span>}
        </header>
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {TabComponent && <TabComponent />}
        </div>
      </main>
      <AIAssistant activeTab={validTab} />
    </div>
  )
}
