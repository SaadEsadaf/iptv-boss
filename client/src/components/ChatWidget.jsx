import { useState, useEffect, useRef } from 'react'
import api from '../api'

function generateId() {
  return 'chat_' + Math.random().toString(36).slice(2, 10)
}

function getSessionId() {
  let id = localStorage.getItem('chat_session_id')
  if (!id) {
    id = generateId()
    localStorage.setItem('chat_session_id', id)
  }
  return id
}

const MAX_IMG_SIZE = 2 * 1024 * 1024 // 2MB
const BROWSER_LANG = (navigator.language || 'en').split('-')[0]

function resizeImage(file, maxBytes, cb) {
  const reader = new FileReader()
  reader.onload = e => {
    const img = new Image()
    img.onload = () => {
      let w = img.width, h = img.height
      // Scale down if too large
      const maxDim = 1920
      if (w > maxDim || h > maxDim) {
        const ratio = Math.min(maxDim / w, maxDim / h)
        w = Math.round(w * ratio)
        h = Math.round(h * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      // Try quality steps until under limit
      let quality = 0.85
      let data = canvas.toDataURL('image/jpeg', quality)
      while (data.length > maxBytes && quality > 0.2) {
        quality -= 0.1
        data = canvas.toDataURL('image/jpeg', quality)
      }
      cb(data)
    }
    img.src = e.target.result
  }
  reader.readAsDataURL(file)
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [autoOpened, setAutoOpened] = useState(false)
  const [showTrialForm, setShowTrialForm] = useState(false)
  const [trialForm, setTrialForm] = useState({ name: '', email: '', phone: '', providerId: '' })
  const [trialProviders, setTrialProviders] = useState([])
  const [trialSubmitting, setTrialSubmitting] = useState(false)
  const [trialSuccess, setTrialSuccess] = useState(null)
  const [imageToSend, setImageToSend] = useState(null) // base64 string
  const [imagePreview, setImagePreview] = useState(null) // thumbnail for display
  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    window.openChatWithMessage = (msg) => {
      setOpen(true)
      if (msg) {
        setTimeout(() => sendMessage(msg), 500)
      }
    }
    window.__showTrialForm = () => {
      setShowTrialForm(true)
      setOpen(true)
      fetch('/api/providers/active').then(r => r.json()).then(setTrialProviders).catch(() => {})
    }
    return () => {
      delete window.openChatWithMessage
      delete window.__showTrialForm
    }
  }, [])

  useEffect(() => {
    if (!autoOpened) {
      const timer = setTimeout(() => {
        setOpen(true)
        setAutoOpened(true)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [autoOpened])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    // Show thumbnail immediately
    const reader = new FileReader()
    reader.onload = r => setImagePreview(r.target.result)
    reader.readAsDataURL(file)
    // Resize and store
    resizeImage(file, MAX_IMG_SIZE, (compressed) => {
      setImageToSend(compressed)
    })
  }

  function removeImage() {
    setImageToSend(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function sendMessage(text) {
    if ((!text.trim() && !imageToSend) || loading) return
    const userMsg = { role: 'user', text: text.trim() || '(Image)' }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const payload = {
      sessionId: getSessionId(),
      message: text.trim() || '(See screenshot)',
      pageUrl: window.location.href,
      language: BROWSER_LANG,
    }

    if (imageToSend) {
      payload.images = [imageToSend]
      removeImage()
    }

    try {
      const res = await api.post('/chat', payload)
      const botMsg = { role: 'assistant', text: res.data.reply, paymentLink: null, trialCredentials: null, recommendation: null }
      if (res.data.actions) {
        for (const a of res.data.actions) {
          if (a.action === 'recommend_plan') {
            botMsg.recommendation = a
          }
          if (a.action === 'create_sellup_order') {
            botMsg.paymentLink = res.data.reply.match(/https?:\/\/[^\s]+/)?.[0] || null
          }
          if (a.action === 'send_trial') {
            botMsg.trialCredentials = { text: 'Credentials sent to your email!' }
          }
        }
      }
      setMessages(prev => [...prev, botMsg])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: "Sorry, I'm having trouble. Please try again." }])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  function handleSelectPlan(rec) {
    const msg = rec.is_trial ? `I'd like the free trial for ${rec.provider_name} ${rec.plan_name}` : `I'd like to subscribe to ${rec.provider_name} ${rec.plan_name}`
    sendMessage(msg)
  }

  async function handleTrialSubmit(e) {
    e.preventDefault()
    const { name, email, phone, providerId } = trialForm
    if (!email || !providerId) return
    setTrialSubmitting(true)
    try {
      const res = await fetch('/api/trial/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, providerId: parseInt(providerId), sessionId: getSessionId() }),
      })
      const data = await res.json()
      if (data.success) {
        setTrialSuccess(data)
      } else {
        alert(data.error || 'Trial claim failed')
      }
    } catch {
      alert('Network error. Please try again.')
    } finally {
      setTrialSubmitting(false)
    }
  }

  const showEmpty = messages.length === 0 && !showTrialForm && !trialSuccess
  const showTrialCard = showTrialForm && !trialSuccess

  return (
    <>
      <button id="open-chat" onClick={() => setOpen(!open)} style={{
        position: 'fixed', bottom: 24, right: 24, width: 56, height: 56,
        background: '#00d4ff', border: 'none', borderRadius: '50%',
        cursor: 'pointer', fontSize: 24, zIndex: 1000,
        boxShadow: '0 4px 20px rgba(0,212,255,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {open ? '✕' : '💬'}
      </button>

      {open && (
        <div style={{
          position: 'fixed', bottom: 92, right: 24, width: 380, height: 560,
          background: '#1a1a1a', borderRadius: 16, border: '1px solid #2a2a2a',
          display: 'flex', flexDirection: 'column', zIndex: 1000,
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)', overflow: 'hidden',
        }}>
          <div style={{ padding: '16px 20px', background: '#0f0f0f', borderBottom: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, background: '#00d4ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#000' }}>A</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>Alex</div>
              <div style={{ fontSize: 12, color: '#00d4ff' }}>Online</div>
            </div>
            <span style={{ fontSize: 11, color: '#666', background: '#0f0f0f', padding: '2px 8px', borderRadius: 10, border: '1px solid #2a2a2a' }}>
              🌐 {BROWSER_LANG.toUpperCase()}
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {showEmpty && (
              <div style={{ textAlign: 'center', color: '#666', padding: 40, fontSize: 14 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
                <p>Hi! I'm Alex, your sales assistant.</p>
                <p>Looking for a trial or a paid plan?</p>
                <p>What kind of content interests you?</p>
              </div>
            )}

            {showTrialCard && (
              <div style={{ background: '#2a2a2a', borderRadius: 12, padding: 16, fontSize: 14 }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>👋</div>
                <p style={{ color: '#fff', margin: '0 0 4px', fontWeight: 600 }}>Hey! Let's set up your free trial.</p>
                <p style={{ color: '#a0a0a0', margin: '0 0 16px', fontSize: 13 }}>Fill in the details below and I'll send your credentials right away.</p>
                <form onSubmit={handleTrialSubmit}>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ color: '#a0a0a0', fontSize: 12, display: 'block', marginBottom: 4 }}>Your Name (optional)</label>
                    <input value={trialForm.name} onChange={e => setTrialForm(f => ({ ...f, name: e.target.value }))} placeholder="John Doe"
                      style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ color: '#a0a0a0', fontSize: 12, display: 'block', marginBottom: 4 }}>Email Address *</label>
                    <input value={trialForm.email} onChange={e => setTrialForm(f => ({ ...f, email: e.target.value }))} placeholder="john@example.com" type="email" required
                      style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ color: '#a0a0a0', fontSize: 12, display: 'block', marginBottom: 4 }}>WhatsApp (optional)</label>
                    <input value={trialForm.phone} onChange={e => setTrialForm(f => ({ ...f, phone: e.target.value }))} placeholder="+212612345678"
                      style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ color: '#a0a0a0', fontSize: 12, display: 'block', marginBottom: 4 }}>Choose Provider *</label>
                    <select value={trialForm.providerId} onChange={e => setTrialForm(f => ({ ...f, providerId: e.target.value }))} required
                      style={{ ...inputStyle, appearance: 'auto' }}>
                      <option value="">Select a provider</option>
                      {trialProviders.map(p => (
                        <option key={p.id} value={p.id}>{p.name} — {p.plan_name}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" disabled={trialSubmitting} style={{
                    width: '100%', padding: '10px', background: '#00d4ff', color: '#000',
                    border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14,
                    opacity: trialSubmitting ? 0.6 : 1,
                  }}>
                    {trialSubmitting ? 'Sending your trial...' : '🎁 Get My Free Trial'}
                  </button>
                </form>
              </div>
            )}

            {trialSuccess && (
              <div style={{ background: '#00cc6620', border: '1px solid #00cc66', borderRadius: 12, padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <p style={{ color: '#00cc66', fontWeight: 700, margin: '0 0 8px', fontSize: 16 }}>Your trial is ready!</p>
                <p style={{ color: '#a0a0a0', fontSize: 13, margin: '0 0 4px' }}>
                  We've sent your login credentials to:
                </p>
                <p style={{ color: '#fff', fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>{trialForm.email}</p>
                <p style={{ color: '#a0a0a0', fontSize: 13, margin: '0 0 4px' }}>
                  Provider: <span style={{ color: '#fff' }}>{trialSuccess.provider_name}</span>
                </p>
                <p style={{ color: '#a0a0a0', fontSize: 13, margin: '0 0 16px' }}>
                  Duration: <span style={{ color: '#fff' }}>{trialSuccess.duration_hours} hours</span>
                </p>
                <button onClick={() => sendMessage("I'd like to upgrade to a full plan")} style={{
                  background: '#00d4ff', color: '#000', border: 'none', padding: '10px 24px',
                  borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14,
                }}>
                  💳 Upgrade to Full Plan
                </button>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%', padding: '10px 14px', borderRadius: 12,
                  background: m.role === 'user' ? '#00d4ff' : '#2a2a2a',
                  color: m.role === 'user' ? '#000' : '#fff',
                  fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap',
                }}>
                  {m.text}
                  {m.paymentLink && (
                    <a href={m.paymentLink} target="_blank" rel="noreferrer" style={{
                      display: 'block', textAlign: 'center', marginTop: 12,
                      background: '#00d4ff', color: '#000', padding: '10px 20px',
                      borderRadius: 8, fontWeight: 700, textDecoration: 'none',
                    }}>
                      Complete Payment
                    </a>
                  )}
                  {m.trialCredentials && (
                    <div style={{
                      textAlign: 'center', marginTop: 12,
                      background: '#00cc66', color: '#fff', padding: '10px 20px',
                      borderRadius: 8, fontWeight: 600,
                    }}>
                      ✅ Trial Activated — Check your email!
                    </div>
                  )}
                </div>
                {m.recommendation && (
                  <div style={{
                    marginTop: 8, background: '#0f0f0f', border: '1px solid #333',
                    borderRadius: 12, padding: 14, width: '90%',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: '#00d4ff20', color: '#00d4ff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 16, flexShrink: 0,
                      }}>
                        {m.recommendation.provider_name?.[0] || 'P'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{m.recommendation.provider_name}</div>
                        <div style={{ color: '#00d4ff', fontSize: 13 }}>{m.recommendation.plan_name}</div>
                      </div>
                      <div style={{ marginLeft: 'auto', fontSize: 18, fontWeight: 700, color: '#00d4ff' }}>
                        {m.recommendation.is_trial ? 'Free' : `$${m.recommendation.price}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#a0a0a0', marginBottom: 10 }}>
                      <span>📺 {m.recommendation.channels} channels</span>
                      <span>📡 {m.recommendation.streams} stream{m.recommendation.streams > 1 ? 's' : ''}</span>
                      <span>📅 {m.recommendation.duration_days}d</span>
                    </div>
                    <button onClick={() => handleSelectPlan(m.recommendation)} style={{
                      width: '100%', padding: '8px', background: '#00d4ff', color: '#000',
                      border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13,
                    }}>
                      {m.recommendation.is_trial ? 'Start Free Trial' : 'Select This Plan'}
                    </button>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: '#2a2a2a', padding: '12px 16px', borderRadius: 12, display: 'flex', gap: 4 }}>
                  <span style={{ width: 6, height: 6, background: '#666', borderRadius: '50%', animation: 'bounce 1s infinite' }} />
                  <span style={{ width: 6, height: 6, background: '#666', borderRadius: '50%', animation: 'bounce 1s infinite 0.2s' }} />
                  <span style={{ width: 6, height: 6, background: '#666', borderRadius: '50%', animation: 'bounce 1s infinite 0.4s' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {imagePreview && (
            <div style={{ padding: '4px 12px', background: '#0f0f0f', borderTop: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src={imagePreview} alt="Preview" style={{ height: 40, borderRadius: 4, border: '1px solid #333' }} />
              <span style={{ color: '#666', fontSize: 11, flex: 1 }}>1 image ready</span>
              <button onClick={removeImage} style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>✕</button>
            </div>
          )}

          <div style={{ padding: 12, borderTop: '1px solid #2a2a2a', display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} />
            <button onClick={() => fileInputRef.current?.click()} disabled={loading}
              style={{
                background: 'transparent', border: '1px solid #333', borderRadius: 8, cursor: 'pointer',
                fontSize: 18, padding: '8px 10px', color: '#666', lineHeight: 1, flexShrink: 0,
              }}>
              📷
            </button>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              disabled={loading}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #2a2a2a',
                background: '#0f0f0f', color: '#fff', fontSize: 14, outline: 'none',
              }}
            />
            <button onClick={() => sendMessage(input)} disabled={loading || (!input.trim() && !imageToSend)} style={{
              padding: '10px 16px', background: '#00d4ff', color: '#000', border: 'none',
              borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14,
              opacity: loading || (!input.trim() && !imageToSend) ? 0.5 : 1,
            }}>
              Send
            </button>
          </div>
        </div>
      )}
    </>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #333',
  background: '#0f0f0f', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box',
}
