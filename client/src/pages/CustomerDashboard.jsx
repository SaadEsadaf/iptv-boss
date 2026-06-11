import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

const APPS = {
  tivimate: { name: 'TiviMate', icon: '🔥', download: 'https://play.google.com/store/apps/details?id=ar.tvplayer.tv', desc: 'Firestick & Android TV' },
  smarters: { name: 'IPTV Smarters', icon: '📱', download: 'https://www.iptvsmarters.com/', desc: 'Android & iOS' },
  gse: { name: 'GSE Smart IPTV', icon: '🍎', download: 'https://apps.apple.com/app/gse-smart-iptv/id1028734683', desc: 'iPhone & Apple TV' },
  vlc: { name: 'VLC Media Player', icon: '💻', download: 'https://www.videolan.org/vlc/', desc: 'PC & Mac' },
  m3u: { name: 'M3U Link', icon: '🔗', download: null, desc: 'Universal' },
}

const SETUP_STEPS = {
  tivimate: [
    { icon: '1', text: 'Download TiviMate from Google Play' },
    { icon: '2', text: 'Open app → Settings → Playlists → Add' },
    { icon: '3', text: 'Choose "Xtream Codes API"' },
    { icon: '4', text: 'Enter Server URL, Username & Password below' },
    { icon: '5', text: 'Done! Start watching' },
  ],
  smarters: [
    { icon: '1', text: 'Download IPTV Smarters from their site' },
    { icon: '2', text: 'Open app → "Add New User"' },
    { icon: '3', text: 'Choose "Xtream Codes API"' },
    { icon: '4', text: 'Enter Server URL, Username & Password below' },
    { icon: '5', text: 'Done! Start watching' },
  ],
  gse: [
    { icon: '1', text: 'Download GSE Smart IPTV from App Store' },
    { icon: '2', text: 'Open app → "Add Playlist"' },
    { icon: '3', text: 'Choose "Xtream Codes API"' },
    { icon: '4', text: 'Enter Server URL, Username & Password below' },
    { icon: '5', text: 'Done! Start watching' },
  ],
  vlc: [
    { icon: '1', text: 'Download VLC Media Player' },
    { icon: '2', text: 'Open VLC → Media → Open Network Stream' },
    { icon: '3', text: 'Paste the M3U link below' },
    { icon: '4', text: 'Click Play — your channels load instantly' },
  ],
  m3u: [
    { icon: '1', text: 'Copy the M3U link below' },
    { icon: '2', text: 'Open your IPTV player' },
    { icon: '3', text: 'Paste the link as M3U playlist' },
    { icon: '4', text: 'Done! All channels loaded' },
  ],
}

export default function CustomerDashboard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [profile, setProfile] = useState(null)
  const [orders, setOrders] = useState([])
  const [plans, setPlans] = useState([])
  const [preferredApp, setPreferredApp] = useState('tivimate')
  const [authToken, setAuthToken] = useState(localStorage.getItem('customer_token'))
  const [loading, setLoading] = useState(true)
  const [showLogin, setShowLogin] = useState(!localStorage.getItem('customer_token'))
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [registerMode, setRegisterMode] = useState(false)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState({})
  const [copied, setCopied] = useState(null)

  // Handle magic link
  useEffect(() => {
    const magicToken = searchParams.get('magic')
    const magicEmail = searchParams.get('email')
    if (magicToken && magicEmail) {
      fetch('/api/account/magic-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: magicToken, email: magicEmail }),
      }).then(r => r.json()).then(data => {
        if (data.token) {
          localStorage.setItem('customer_token', data.token)
          setAuthToken(data.token)
          setShowLogin(false)
          navigate('/dashboard', { replace: true })
        }
      }).catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!authToken) return
    fetch('/api/account/profile', {
      headers: { 'Authorization': `Bearer ${authToken}` },
    }).then(r => r.json()).then(data => {
      if (!data.user) { setShowLogin(true); return }
      setProfile(data.user)
      setOrders(data.orders || [])
      setPlans(data.plans || [])
    }).finally(() => setLoading(false))
  }, [authToken])

  // Countdown timer
  useEffect(() => {
    const activeTrial = orders.find(o => o.is_trial && (o.status === 'completed'))
    if (!activeTrial?.expires_at) return
    const interval = setInterval(() => {
      const diff = new Date(activeTrial.expires_at).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft({ expired: true }); clearInterval(interval); return }
      const h = Math.floor(diff / (1000 * 60 * 60))
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const s = Math.floor((diff % (1000 * 60)) / 1000)
      setTimeLeft({ h, m, s, expired: false })
    }, 1000)
    return () => clearInterval(interval)
  }, [orders])

  async function handleLogin(e) {
    e.preventDefault(); setError('')
    const endpoint = registerMode ? '/api/account/register' : '/api/account/login'
    const body = registerMode
      ? { name: loginEmail.split('@')[0], email: loginEmail, password: loginPassword }
      : { email: loginEmail, password: loginPassword }
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      localStorage.setItem('customer_token', data.token)
      setAuthToken(data.token)
      setShowLogin(false)
    } catch { setError('Network error') }
  }

  async function handleMagicLink() {
    if (!loginEmail.trim()) return
    setError('')
    await fetch('/api/account/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: loginEmail.trim() }),
    })
    setError('✅ Magic link sent! Check your email.')
  }

  function copy(text, key) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  function logout() {
    localStorage.removeItem('customer_token')
    setAuthToken(null)
    setShowLogin(true)
    setProfile(null)
  }

  const activeTrial = orders.find(o => o.is_trial && o.status === 'completed')
  const paidOrders = orders.filter(o => !o.is_trial && o.status === 'completed')
  const pendingOrders = orders.filter(o => o.status === 'pending')

  if (showLogin) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ maxWidth: 420, width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>📺</div>
            <h1 style={{ color: '#fff', margin: '0 0 4px', fontSize: 24 }}>My Account</h1>
            <p style={{ color: '#666', margin: 0, fontSize: 13 }}>Sign in to access your dashboard</p>
          </div>
          <form onSubmit={handleLogin} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 16, padding: 24 }}>
            <input value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="Email" type="email" required
              style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #333', background: '#0f0f0f', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
            {registerMode && (
              <input value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Password" type="password" required
                style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #333', background: '#0f0f0f', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
            )}
            {!registerMode && (
              <input value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Password" type="password"
                style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #333', background: '#0f0f0f', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
            )}
            {error && <p style={{ color: error.startsWith('✅') ? '#00cc66' : '#ff4444', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}
            <button type="submit" style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #00d4ff, #0090ff)', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: 'pointer', marginBottom: 8 }}>
              {registerMode ? 'Create Account' : 'Sign In'}
            </button>
            <button type="button" onClick={handleMagicLink} style={{ width: '100%', padding: '10px', background: 'transparent', color: '#00d4ff', border: '1px solid #00d4ff', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer', marginBottom: 8 }}>
              Send Magic Link ✉️
            </button>
            <button type="button" onClick={() => setRegisterMode(!registerMode)} style={{ width: '100%', padding: '8px', background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: 13 }}>
              {registerMode ? 'Already have an account? Sign In' : "Don't have an account? Register"}
            </button>
            <a href="/" style={{ display: 'block', textAlign: 'center', marginTop: 12, color: '#666', fontSize: 13, textDecoration: 'none' }}>← Back to home</a>
          </form>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#666', fontSize: 14 }}>Loading...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>
      {/* Header */}
      <header style={{ background: '#1a1a1a', borderBottom: '1px solid #2a2a2a', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>📺</span>
          <span style={{ fontWeight: 700, fontSize: 16 }}>My Dashboard</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {profile && <span style={{ color: '#a0a0a0', fontSize: 13 }}>{profile.email}</span>}
          <button onClick={logout} style={{ padding: '6px 14px', background: '#2a2a2a', border: 'none', borderRadius: 6, color: '#a0a0a0', cursor: 'pointer', fontSize: 12 }}>Logout</button>
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
        {/* Active Trial Card */}
        {activeTrial && (
          <div style={{ background: 'linear-gradient(135deg, #0a1628, #1a1a2e)', border: '2px solid #00d4ff30', borderRadius: 20, padding: '28px 24px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,255,0.1), transparent)', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 20 }}>⚡</span>
                  <span style={{ color: '#00d4ff', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 }}>Trial Active</span>
                </div>
                <h2 style={{ margin: '4px 0 2px', fontSize: 20 }}>{activeTrial.provider_name || 'Atlas'} IPTV</h2>
                <p style={{ color: '#a0a0a0', fontSize: 13, margin: 0 }}>{activeTrial.plan_name || '24h Trial'}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <span style={{ color: '#666', fontSize: 12 }}>Plan:</span>
                  <span style={{ color: '#00d4ff', fontSize: 13, fontWeight: 600 }}>{activeTrial.plan_name || 'Essai 24h'}</span>
                </div>
              </div>

              {/* Countdown */}
              <div style={{ textAlign: 'center', minWidth: 140 }}>
                {timeLeft.expired ? (
                  <div>
                    <div style={{ fontSize: 14, color: '#ff4444', fontWeight: 700 }}>EXPIRED</div>
                    <a href="#plans" style={{ display: 'inline-block', marginTop: 8, padding: '8px 20px', background: 'linear-gradient(135deg, #ff6b35, #ff2d92)', color: '#fff', borderRadius: 8, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>Upgrade Now</a>
                  </div>
                ) : timeLeft.h !== undefined ? (
                  <div>
                    <div style={{ color: '#666', fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Time Remaining</div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                      {[
                        { v: timeLeft.h, l: 'H' },
                        { v: timeLeft.m, l: 'M' },
                        { v: timeLeft.s, l: 'S' },
                      ].map(t => (
                        <div key={t.l} style={{ background: 'rgba(0,212,255,0.1)', borderRadius: 10, padding: '6px 12px', minWidth: 48 }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: '#00d4ff' }}>{String(t.v).padStart(2, '0')}</div>
                          <div style={{ fontSize: 10, color: '#666' }}>{t.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          {/* Stats cards */}
          {[
            { label: 'Active Orders', value: paidOrders.length + (activeTrial ? 1 : 0), icon: '✅', color: '#00cc66' },
            { label: 'Pending', value: pendingOrders.length, icon: '⏳', color: '#ffaa00' },
            { label: 'App', value: APPS[activeTrial?.preferred_app || 'tivimate']?.name || 'TiviMate', icon: '📱', color: '#00d4ff' },
            { label: 'Support', value: '24/7 Chat', icon: '💬', color: '#8b5cf6' },
          ].map(s => (
            <div key={s.label} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 14, padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 20 }}>{s.icon}</span>
                <span style={{ color: '#666', fontSize: 12 }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Credentials + Setup */}
        {activeTrial && activeTrial.credentials && (
          <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 16, padding: 24, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18 }}>🔑 Your Credentials</h3>
                <p style={{ color: '#666', margin: '4px 0 0', fontSize: 13 }}>Use these to connect on your device</p>
              </div>
              {/* App selector */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Object.entries(APPS).map(([key, app]) => (
                  <button key={key} onClick={() => setPreferredApp(key)}
                    style={{ padding: '6px 10px', background: preferredApp === key ? '#00d4ff20' : '#0f0f0f', border: preferredApp === key ? '1.5px solid #00d4ff' : '1px solid #2a2a2a', borderRadius: 8, cursor: 'pointer', color: preferredApp === key ? '#00d4ff' : '#666', fontSize: 11, fontWeight: preferredApp === key ? 600 : 400 }}>
                    {app.icon} {app.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Credentials display */}
            <div style={{ background: '#0f0f0f', borderRadius: 12, padding: 20, marginBottom: 20, fontFamily: 'monospace' }}>
              {activeTrial.credentials.type === 'xtream' && (
                <>
                  {[
                    { label: 'Server URL', value: activeTrial.credentials.server_url, key: 'server' },
                    { label: 'Username', value: activeTrial.credentials.username, key: 'user' },
                    { label: 'Password', value: activeTrial.credentials.password, key: 'pass' },
                  ].map(c => (
                    <div key={c.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1a1a1a' }}>
                      <span style={{ color: '#666', fontSize: 12 }}>{c.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#00d4ff', fontSize: 13 }}>{c.value}</span>
                        <button onClick={() => copy(c.value, c.key)} style={{ background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 4, padding: '2px 8px', color: copied === c.key ? '#00cc66' : '#666', cursor: 'pointer', fontSize: 11 }}>{copied === c.key ? '✓' : '📋'}</button>
                      </div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                    <span style={{ color: '#666', fontSize: 12 }}>M3U Link</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#a0a0a0', fontSize: 12, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeTrial.credentials.m3u_url}</span>
                      <button onClick={() => copy(activeTrial.credentials.m3u_url, 'm3u')} style={{ background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 4, padding: '2px 8px', color: copied === 'm3u' ? '#00cc66' : '#666', cursor: 'pointer', fontSize: 11 }}>{copied === 'm3u' ? '✓' : '📋'}</button>
                    </div>
                  </div>
                </>
              )}
              {activeTrial.credentials.type === 'm3u' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                  <span style={{ color: '#666', fontSize: 12 }}>M3U URL</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#00d4ff', fontSize: 13 }}>{activeTrial.credentials.m3u_url}</span>
                    <button onClick={() => copy(activeTrial.credentials.m3u_url, 'm3u')} style={{ background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 4, padding: '2px 8px', color: copied === 'm3u' ? '#00cc66' : '#666', cursor: 'pointer', fontSize: 11 }}>{copied === 'm3u' ? '✓' : '📋'}</button>
                  </div>
                </div>
              )}
              {activeTrial.credentials.type === 'code' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                  <span style={{ color: '#666', fontSize: 12 }}>Activation Code</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#ffd700', fontSize: 22, fontWeight: 800, letterSpacing: 3 }}>{activeTrial.credentials.code}</span>
                    <button onClick={() => copy(activeTrial.credentials.code, 'code')} style={{ background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 4, padding: '2px 8px', color: copied === 'code' ? '#00cc66' : '#666', cursor: 'pointer', fontSize: 11 }}>{copied === 'code' ? '✓' : '📋'}</button>
                  </div>
                </div>
              )}
            </div>

            {/* App Setup Steps */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#a0a0a0' }}>
                {APPS[preferredApp]?.icon} Setup for {APPS[preferredApp]?.name}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(SETUP_STEPS[preferredApp] || []).map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#0f0f0f', borderRadius: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#00d4ff20', color: '#00d4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{step.icon}</div>
                    <span style={{ fontSize: 13, color: '#ccc' }}>{step.text}</span>
                  </div>
                ))}
              </div>
              {APPS[preferredApp]?.download && (
                <a href={APPS[preferredApp].download} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, padding: '10px 20px', background: '#00d4ff', color: '#000', borderRadius: 8, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                  📥 Download {APPS[preferredApp].name}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Upgrade CTA */}
        <div style={{ background: 'linear-gradient(135deg, #1a0a2e, #2a1a3e)', border: '2px solid #ff6b3530', borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 18 }}>🚀 Upgrade Your Plan</h3>
              <p style={{ color: '#a0a0a0', margin: '4px 0 0', fontSize: 13 }}>Unlock all channels, 4K, and multi-device support</p>
            </div>
            {activeTrial && (
              <div style={{ fontSize: 12, color: '#ff6b35', fontWeight: 600, background: '#ff6b3520', padding: '4px 12px', borderRadius: 20 }}>
                {timeLeft.expired ? 'Trial ended — renew now' : `${timeLeft.h || 0}h ${timeLeft.m || 0}m left on trial`}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {plans.filter(p => p.price_sell > 0).slice(0, 4).map(plan => (
              <div key={plan.id} style={{ background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 12, padding: '16px', position: 'relative' }}>
                {plan.duration_months >= 12 && (
                  <div style={{ position: 'absolute', top: -6, right: 10, background: '#ffd700', color: '#000', fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 10 }}>BEST VALUE</div>
                )}
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{plan.plan_name}</div>
                <div style={{ color: '#666', fontSize: 12, marginBottom: 8 }}>{plan.provider_name}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#00d4ff', marginBottom: 4 }}>
                  €{plan.price_sell}
                  {plan.duration_months > 1 && <span style={{ fontSize: 13, color: '#666', fontWeight: 400 }}> / {plan.duration_months}mois</span>}
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#666', marginBottom: 12 }}>
                  <span>📺 {plan.channels?.toLocaleString() || '34K'} chan</span>
                  <span>📡 {plan.streams} écrans</span>
                </div>
                <button onClick={() => window.location.href = '/#plans'} style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, #ff6b35, #ff2d92)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  Upgrade
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Support */}
        <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 18 }}>💬 Need Help?</h3>
              <p style={{ color: '#666', margin: '4px 0 0', fontSize: 13 }}>We're here 24/7 to help you get set up</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href="/support" style={{ padding: '8px 16px', background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8, color: '#00d4ff', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>📖 FAQ</a>
              <a href="/downloads" style={{ padding: '8px 16px', background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8, color: '#00d4ff', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>📥 Apps</a>
            </div>
          </div>
          <div style={{ background: '#0f0f0f', borderRadius: 12, padding: 16 }}>
            <p style={{ color: '#a0a0a0', fontSize: 13, margin: '0 0 12px' }}>
              Common issues: Open the IPTV app → Settings → Playlists → Edit → Double-check Server URL (no http://), Username, and Password.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { const btn = document.querySelector('[class*="chatWidget"]') || document.querySelector('[class*="ChatWidget"]') || document.querySelector('[data-chat]'); if (btn) btn.click(); else { const ev = new CustomEvent('open-chat'); window.dispatchEvent(ev) }}}
                style={{ padding: '10px 20px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                💬 Chat with Alex
              </button>
              <a href={`mailto:support@dalletek.live`} style={{ padding: '10px 20px', background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8, color: '#a0a0a0', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                ✉️ Email
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
