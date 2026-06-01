import { useState, useEffect, useRef } from 'react'

export default function AuthModal({ settings, onAuth, onClose }) {
  const [tab, setTab] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const googleBtnRef = useRef(null)

  useEffect(() => {
    if (!settings?.googleClientId) return
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      if (window.google && googleBtnRef.current) {
        window.google.accounts.id.initialize({
          client_id: settings.googleClientId,
          callback: handleGoogleResponse,
          context: 'signin',
        })
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          type: 'standard', shape: 'rectangular', theme: 'outline',
          size: 'large', width: '100%', text: 'signin_with',
          logo_alignment: 'center',
        })
      }
    }
    document.body.appendChild(script)
    return () => { document.body.removeChild(script) }
  }, [settings?.googleClientId])

  function handleGoogleResponse(response) {
    setLoading(true)
    setError('')
    fetch('/api/auth/google', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: response.credential }),
    }).then(r => r.json()).then(data => {
      if (data.token) { localStorage.setItem('user_token', data.token); onAuth(data.user, data.token) }
      else setError(data.error || 'Google sign-in failed')
    }).catch(() => setError('Network error')).finally(() => setLoading(false))
  }

  async function handleAppleSignIn() {
    setError('')
    try {
      const res = await fetch('/api/checkout/settings')
      const s = await res.json()
      if (!s.appleClientId) { setError('Apple sign-in not configured'); return }
      const script = document.createElement('script')
      script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js'
      await new Promise((resolve, reject) => { script.onload = resolve; script.onerror = reject; document.body.appendChild(script) })
      window.AppleID.auth.init({ clientId: s.appleClientId, scope: 'name email', redirectURI: window.location.origin, usePopup: true })
      const response = await window.AppleID.auth.signIn()
      setLoading(true)
      const r = await fetch('/api/auth/apple', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: response.authorization.id_token }),
      })
      const data = await r.json()
      if (data.token) { localStorage.setItem('user_token', data.token); onAuth(data.user, data.token) }
      else setError(data.error || 'Apple sign-in failed')
    } catch (e) { setError('Apple sign-in cancelled or failed') }
    finally { setLoading(false) }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim() || !password.trim() || (tab === 'signup' && !name.trim())) return
    setLoading(true); setError('')
    const endpoint = tab === 'signup' ? '/api/auth/signup' : '/api/auth/login'
    const body = tab === 'signup' ? { name: name.trim(), email: email.trim(), password } : { email: email.trim(), password }
    try {
      const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await r.json()
      if (data.token) { localStorage.setItem('user_token', data.token); onAuth(data.user, data.token) }
      else setError(data.error || 'Authentication failed')
    } catch { setError('Network error') }
    finally { setLoading(false) }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 2000,
    }}>
      <div style={{
        background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 16,
        padding: 28, maxWidth: 400, width: '90%', position: 'relative',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 12, right: 16, background: 'transparent',
          border: 'none', color: '#a0a0a0', cursor: 'pointer', fontSize: 22,
        }}>✕</button>

        <h2 style={{ margin: '0 0 16px', fontSize: 20, color: '#fff', textAlign: 'center' }}>
          {tab === 'login' ? 'Welcome Back' : 'Create Account'}
        </h2>

        <div style={{ display: 'flex', marginBottom: 20, borderRadius: 8, overflow: 'hidden', border: '1px solid #2a2a2a' }}>
          <button onClick={() => setTab('login')} style={{
            flex: 1, padding: '10px', background: tab === 'login' ? '#00d4ff' : 'transparent',
            color: tab === 'login' ? '#000' : '#666', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 13,
          }}>Sign In</button>
          <button onClick={() => setTab('signup')} style={{
            flex: 1, padding: '10px', background: tab === 'signup' ? '#00d4ff' : 'transparent',
            color: tab === 'signup' ? '#000' : '#666', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 13,
          }}>Sign Up</button>
        </div>

        {error && (
          <div style={{ background: '#ff444420', border: '1px solid #ff4444', borderRadius: 8, padding: 10, marginBottom: 14, color: '#ff4444', fontSize: 13, textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {tab === 'signup' && (
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" required
              style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #333', background: '#0f0f0f', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />
          )}
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" required
            style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #333', background: '#0f0f0f', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required minLength={6}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #333', background: '#0f0f0f', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 14 }} />
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '12px', background: loading ? '#2a2a2a' : '#00d4ff', color: loading ? '#666' : '#000',
            border: 'none', borderRadius: 8, fontWeight: 700, cursor: loading ? 'default' : 'pointer', fontSize: 15,
          }}>
            {loading ? 'Processing...' : tab === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
          <div style={{ flex: 1, height: 1, background: '#2a2a2a' }} />
          <span style={{ color: '#666', fontSize: 12 }}>or continue with</span>
          <div style={{ flex: 1, height: 1, background: '#2a2a2a' }} />
        </div>

        {settings?.googleClientId ? (
          <div ref={googleBtnRef} style={{ marginBottom: 10 }} />
        ) : (
          <div style={{ padding: '12px 14px', borderRadius: 8, border: '1px solid #2a2a2a', background: '#0f0f0f', color: '#555', fontSize: 13, textAlign: 'center', marginBottom: 10 }}>
            Google Sign-In — configure Google OAuth Client ID in Admin Settings
          </div>
        )}

        <button onClick={handleAppleSignIn} disabled={!settings?.appleClientId || loading} style={{
          width: '100%', padding: '12px', background: settings?.appleClientId ? '#000' : '#0f0f0f',
          color: settings?.appleClientId ? '#fff' : '#555', border: '1px solid #333', borderRadius: 8,
          fontWeight: 600, cursor: settings?.appleClientId ? 'pointer' : 'default', fontSize: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
          {settings?.appleClientId ? 'Sign in with Apple' : 'Apple Sign-In — configure in Admin Settings'}
        </button>

        {tab === 'signup' && (
          <p style={{ color: '#666', fontSize: 12, textAlign: 'center', marginTop: 14 }}>
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </p>
        )}
      </div>
    </div>
  )
}
