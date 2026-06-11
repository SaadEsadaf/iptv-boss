import { useState, useEffect, useRef } from 'react'
import api from '../api'
import CheckoutModal from './CheckoutModal'

const ws = typeof window !== 'undefined' && window.__WEBSITE__
const lang = ws?.language || 'en'
const FR = {
  online: 'En ligne', contactWhatsApp: 'Contact via WhatsApp',
  hi: "Bonjour ! Je suis Alex, votre assistant commercial.",
  lookingFor: 'Vous cherchez un essai ou un forfait payant ?',
  contentInterests: 'Quel type de contenu vous intéresse ?',
  trialHeading: 'Hey ! Configurons votre essai gratuit.',
  trialDesc: 'Remplissez les détails ci-dessous et je vous enverrai vos identifiants immédiatement.',
  nameLabel: 'Votre Nom (facultatif)', namePlaceholder: 'Jean Dupont',
  emailLabel: 'Adresse Email *', emailPlaceholder: 'jean@exemple.com',
  whatsappLabel: 'WhatsApp (facultatif)', whatsappPlaceholder: '+212612345678',
  providerLabel: 'Choisissez le Fournisseur *',
  selectProvider: 'Sélectionnez un fournisseur',
  sendingTrial: 'Envoi de votre essai...',
  getTrial: '🎁 Obtenir Mon Essai Gratuit',
  trialReady: 'Votre essai est prêt !',
  sentTo: 'Nous avons envoyé vos identifiants à :',
  provider: 'Fournisseur :', duration: 'Durée :',
  upgrade: '💳 Passer à un Forfait Complet',
  hours: 'heures',
  completePayment: 'Paiement Complet',
  trialActivated: '✅ Essai Activé — Vérifiez vos emails !',
  free: 'Gratuit', channels: 'chaînes', stream: 'flux', streams: 'flux', day: 'j',
  startFreeTrial: 'Essai Gratuit', selectThisPlan: 'Sélectionner cette Offre',
  buyNow: '💰 Acheter Maintenant',
  imageReady: 'image prête', typeMessage: 'Écrivez un message...', send: 'Envoyer',
  credentialsSent: 'Identifiants envoyés par email !',
  sorry: "Désolé, j'ai un problème. Veuillez réessayer.",
  trialFailed: 'Échec de la demande d\'essai',
  networkError: 'Erreur réseau. Veuillez réessayer.',
}
const t = (key) => lang === 'fr' ? (FR[key] || key) : key

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

const MAX_IMG_SIZE = 2 * 1024 * 1024
const BROWSER_LANG = (navigator.language || 'en').split('-')[0]

function resizeImage(file, maxBytes, cb) {
  const reader = new FileReader()
  reader.onload = e => {
    const img = new Image()
    img.onload = () => {
      let w = img.width, h = img.height
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

export default function ChatWidget({ onBuyPlan }) {
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
  const [imageToSend, setImageToSend] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [checkoutPlan, setCheckoutPlan] = useState(null)
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
    const reader = new FileReader()
    reader.onload = r => setImagePreview(r.target.result)
    reader.readAsDataURL(file)
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
      const botMsg = { role: 'assistant', text: res.data.reply, paymentLink: null, trialCredentials: null, recommendation: null, showCheckoutData: null }
      if (res.data.actions) {
        for (const a of res.data.actions) {
          if (a.action === 'recommend_plan') {
            botMsg.recommendation = a
          }
          if (a.action === 'create_sellup_order') {
            botMsg.paymentLink = res.data.reply.match(/https?:\/\/[^\s]+/)?.[0] || null
          }
          if (a.action === 'send_trial') {
            botMsg.trialCredentials = { text: t('credentialsSent') }
          }
          if (a.action === 'show_checkout' && (onBuyPlan || a.checkoutData)) {
            if (onBuyPlan && a.checkoutData) {
              onBuyPlan(a.checkoutData)
            } else {
              botMsg.showCheckoutData = a.checkoutData || { plan_id: a.plan_id, provider_id: a.provider_id }
            }
          }
        }
      }
      setMessages(prev => [...prev, botMsg])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: t('sorry') }])
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
    if (onBuyPlan && !rec.is_trial) {
      const plan = {
        id: rec.plan_id,
        plan_name: rec.plan_name,
        price_sell: rec.price || rec.price_sell || 0,
        duration_days: rec.duration_days || 30,
        channels: rec.channels || 0,
        streams: rec.streams || 1,
        provider_name: rec.provider_name || 'Atlas',
        provider_id: rec.provider_id || 4,
        plan_type: rec.is_trial ? 'trial' : 'monthly',
      }
      onBuyPlan(plan)
    } else {
      const msg = rec.is_trial ? `I'd like the free trial for ${rec.provider_name} ${rec.plan_name}` : `I'd like to subscribe to ${rec.provider_name} ${rec.plan_name}`
      sendMessage(msg)
    }
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
        alert(data.error || t('trialFailed'))
      }
    } catch {
      alert(t('networkError'))
    } finally {
      setTrialSubmitting(false)
    }
  }

  const showEmpty = messages.length === 0 && !showTrialForm && !trialSuccess
  const showTrialCard = showTrialForm && !trialSuccess

  const whatsappNumber = window.__WEBSITE__?.whatsapp || ''

  return (
    <>
      <div style={{
        position: 'fixed', bottom: 24, right: 24, display: 'flex', gap: 12,
        alignItems: 'flex-end', zIndex: 1000,
      }}>
        {whatsappNumber && (
          <a href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" style={{
            width: 56, height: 56, background: '#25D366', border: 'none', borderRadius: '50%',
            cursor: 'pointer', fontSize: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(37,211,102,0.3)', textDecoration: 'none',
          }} title={t('contactWhatsApp')}>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          </a>
        )}
        <button id="open-chat" onClick={() => setOpen(!open)} style={{
          width: 56, height: 56,
          background: '#00d4ff', border: 'none', borderRadius: '50%',
          cursor: 'pointer', fontSize: 24,
          boxShadow: '0 4px 20px rgba(0,212,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {open ? '✕' : '💬'}
        </button>
      </div>

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
              <div style={{ fontSize: 12, color: '#00d4ff' }}>{t('online')}</div>
            </div>
            <span style={{ fontSize: 11, color: '#666', background: '#0f0f0f', padding: '2px 8px', borderRadius: 10, border: '1px solid #2a2a2a' }}>
              🌐 {BROWSER_LANG.toUpperCase()}
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {showEmpty && (
              <div style={{ textAlign: 'center', color: '#666', padding: 40, fontSize: 14 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
                <p>{t('hi')}</p>
                <p>{t('lookingFor')}</p>
                <p>{t('contentInterests')}</p>
              </div>
            )}

            {showTrialCard && (
              <div style={{ background: '#2a2a2a', borderRadius: 12, padding: 16, fontSize: 14 }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>👋</div>
                <p style={{ color: '#fff', margin: '0 0 4px', fontWeight: 600 }}>{t('trialHeading')}</p>
                <p style={{ color: '#a0a0a0', margin: '0 0 16px', fontSize: 13 }}>{t('trialDesc')}</p>
                <form onSubmit={handleTrialSubmit}>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ color: '#a0a0a0', fontSize: 12, display: 'block', marginBottom: 4 }}>{t('nameLabel')}</label>
                    <input value={trialForm.name} onChange={e => setTrialForm(f => ({ ...f, name: e.target.value }))} placeholder={t('namePlaceholder')}
                      style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ color: '#a0a0a0', fontSize: 12, display: 'block', marginBottom: 4 }}>{t('emailLabel')}</label>
                    <input value={trialForm.email} onChange={e => setTrialForm(f => ({ ...f, email: e.target.value }))} placeholder={t('emailPlaceholder')} type="email" required
                      style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ color: '#a0a0a0', fontSize: 12, display: 'block', marginBottom: 4 }}>{t('whatsappLabel')}</label>
                    <input value={trialForm.phone} onChange={e => setTrialForm(f => ({ ...f, phone: e.target.value }))} placeholder={t('whatsappPlaceholder')}
                      style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ color: '#a0a0a0', fontSize: 12, display: 'block', marginBottom: 4 }}>{t('providerLabel')}</label>
                    <select value={trialForm.providerId} onChange={e => setTrialForm(f => ({ ...f, providerId: e.target.value }))} required
                      style={{ ...inputStyle, appearance: 'auto' }}>
                      <option value="">{t('selectProvider')}</option>
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
                    {trialSubmitting ? t('sendingTrial') : t('getTrial')}
                  </button>
                </form>
              </div>
            )}

            {trialSuccess && (
              <div style={{ background: '#00cc6620', border: '1px solid #00cc66', borderRadius: 12, padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <p style={{ color: '#00cc66', fontWeight: 700, margin: '0 0 8px', fontSize: 16 }}>{t('trialReady')}</p>
                <p style={{ color: '#a0a0a0', fontSize: 13, margin: '0 0 4px' }}>
                  {t('sentTo')}
                </p>
                <p style={{ color: '#fff', fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>{trialForm.email}</p>
                <p style={{ color: '#a0a0a0', fontSize: 13, margin: '0 0 4px' }}>
                  {t('provider')} <span style={{ color: '#fff' }}>{trialSuccess.provider_name}</span>
                </p>
                <p style={{ color: '#a0a0a0', fontSize: 13, margin: '0 0 16px' }}>
                  {t('duration')} <span style={{ color: '#fff' }}>{trialSuccess.duration_hours} {t('hours')}</span>
                </p>
                <button onClick={() => sendMessage("I'd like to upgrade to a full plan")} style={{
                  background: '#00d4ff', color: '#000', border: 'none', padding: '10px 24px',
                  borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14,
                }}>
                  {t('upgrade')}
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
                      {t('completePayment')}
                    </a>
                  )}
                  {m.trialCredentials && (
                    <div style={{
                      textAlign: 'center', marginTop: 12,
                      background: '#00cc66', color: '#fff', padding: '10px 20px',
                      borderRadius: 8, fontWeight: 600,
                    }}>
                      {t('trialActivated')}
                    </div>
                  )}
                </div>
                {m.recommendation && (
                  <div style={{
                    marginTop: 8, background: 'linear-gradient(135deg, #0a1628, #1a1a2e)',
                    border: '1.5px solid #00d4ff40', borderRadius: 14, padding: 16, width: '90%',
                    boxShadow: '0 0 20px rgba(0,212,255,0.1)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 10,
                        background: 'linear-gradient(135deg, #00d4ff, #0090ff)',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 18, flexShrink: 0,
                      }}>
                        {m.recommendation.provider_name?.[0] || 'P'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{m.recommendation.provider_name}</div>
                        <div style={{ color: '#00d4ff', fontSize: 13, fontWeight: 600 }}>{m.recommendation.plan_name}</div>
                      </div>
                      <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#00d4ff' }}>
                          {m.recommendation.is_trial ? t('free') : `${lang === 'fr' ? '€' : '$'}${m.recommendation.price}`}
                        </div>
                        {!m.recommendation.is_trial && (
                          <div style={{ fontSize: 11, color: '#666' }}>
                            {m.recommendation.duration_days}{t('day')}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#a0a0a0', marginBottom: 12 }}>
                      <span>📺 {m.recommendation.channels?.toLocaleString()} {t('channels')}</span>
                      <span>📡 {m.recommendation.streams} {m.recommendation.streams > 1 ? t('streams') : t('stream')}</span>
                      <span>⚡ 4K</span>
                    </div>
                    <button
                      onClick={() => handleSelectPlan(m.recommendation)}
                      style={{
                        width: '100%', padding: '10px',
                        background: m.recommendation.is_trial
                          ? 'linear-gradient(135deg, #00d4ff, #0090ff)'
                          : 'linear-gradient(135deg, #ff6b35, #ff2d92)',
                        color: '#fff', border: 'none', borderRadius: 10,
                        fontWeight: 700, cursor: 'pointer', fontSize: 14,
                        boxShadow: m.recommendation.is_trial
                          ? '0 4px 15px rgba(0,212,255,0.3)'
                          : '0 4px 15px rgba(255,45,146,0.3)',
                        transition: 'all 0.2s',
                      }}
                    >
                      {m.recommendation.is_trial ? t('startFreeTrial') : t('buyNow')}
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
              <span style={{ color: '#666', fontSize: 11, flex: 1 }}>1 {t('imageReady')}</span>
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
              placeholder={t('typeMessage')}
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
              {t('send')}
            </button>
          </div>
        </div>
      )}

      {checkoutPlan && (
        <CheckoutModal
          plan={checkoutPlan}
          onClose={() => setCheckoutPlan(null)}
          userToken={localStorage.getItem('user_token')}
        />
      )}
    </>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #333',
  background: '#0f0f0f', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box',
}
