import { useState, useEffect, useRef } from 'react'

const ws = typeof window !== 'undefined' && window.__WEBSITE__
const lang = ws?.language || 'en'
const FR = {
  paypal: 'PayPal', paypalDesc: 'Payer avec PayPal ou carte bancaire',
  stripe: 'Stripe', stripeDesc: 'Carte de crédit via Stripe',
  crypto: 'Crypto', cryptoDesc: 'USDT (TRC20) ou BTC',
  email: 'Lien Email', emailDesc: 'Recevoir un lien de paiement par email',
  sepa: 'Virement SEPA', sepaDesc: 'Virement bancaire dans l\'UE',
  completePurchase: 'Finaliser l\'Achat',
  notConfigured: 'Aucun moyen de paiement configuré pour cette offre. Contactez le support.',
  paypalNotConfigured: 'PayPal non configuré. Contactez le support.',
  failedToSend: 'Échec de l\'envoi',
  networkError: 'Erreur réseau',
  continue: 'Continuer',
  proceedToPayment: 'Procéder au Paiement',
  paypalCheckout: 'Paiement PayPal',
  embedError: 'PayPal ne peut pas être intégré. Ouvrez-le dans un nouvel onglet.',
  loadingCheckout: 'Chargement du paiement...',
  openPaypal: 'Ouvrir PayPal',
  sendPaypal: 'Envoyez le paiement via PayPal Friends & Family à l\'adresse ci-dessous :',
  copied: 'Copié !',
  copy: 'Copier',
  completedPayment: '✓ J\'ai Effectué le Paiement',
  backToMethods: '← Retour aux méthodes',
  paymentSuccessful: 'Paiement Réussi !',
  credentialsSent: 'Vos identifiants d\'activation seront envoyés par email sous peu.',
  done: 'Terminé',
  stripePayment: 'Paiement Stripe',
  stripeDesc: 'Paiement sécurisé via Stripe. Votre paiement sera traité une fois confirmé.',
  amount: 'Montant :',
  reference: 'Référence :',
  emailPaymentLink: 'Lien de Paiement par Email',
  emailDesc2: 'Entrez votre email et nous vous enverrons un lien de paiement sécurisé.',
  emailPlaceholder: 'votre@email.com',
  sending: 'Envoi en cours...',
  sendPaymentLink: 'Envoyer le Lien de Paiement',
  paymentLinkSent: 'Lien de paiement envoyé !',
  checkInbox: 'Vérifiez votre boîte de réception',
  orOpen: 'Ou ouvrez-le directement :',
  copyLink: 'Copier le Lien',
  cryptoPayment: 'Paiement Crypto',
  cryptoDesc: 'Envoyez le montant exact à l\'une des adresses ci-dessous.',
  usdt: 'USDT (TRC20)',
  btc: 'Bitcoin (BTC)',
  cryptoNotConfigured: 'Adresses crypto non configurées.',
  sepaPayment: 'Virement SEPA',
  sepaDesc2: 'Virez le montant exact sur le compte ci-dessous.',
  sepaAmount: 'Montant', sepaIban: 'IBAN', sepaBic: 'BIC', sepaBank: 'Banque',
  sepaNotConfigured: 'Coordonnées SEPA non configurées.',
}
const t = (key) => lang === 'fr' ? (FR[key] || key) : key

const ALL_METHODS = [
  { id: 'paypal', label: t('paypal'), icon: '💳', desc: t('paypalDesc') },
  { id: 'stripe', label: t('stripe'), icon: '💳', desc: t('stripeDesc') },
  { id: 'crypto', label: t('crypto'), icon: '₿', desc: t('cryptoDesc') },
  { id: 'email', label: t('email'), icon: '📧', desc: t('emailDesc') },
  { id: 'sepa', label: t('sepa'), icon: '🏦', desc: t('sepaDesc') },
]

export default function CheckoutModal({ plan, onClose, userToken }) {
  const [step, setStep] = useState('methods')
  const [selected, setSelected] = useState(null)
  const [settings, setSettings] = useState(null)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sentUrl, setSentUrl] = useState('')
  const [checkoutUrl, setCheckoutUrl] = useState('')
  const [paid, setPaid] = useState(false)
  const [iframeError, setIframeError] = useState(false)
  const [paypalError, setPaypalError] = useState('')
  const [copied, setCopied] = useState(null)
  const iframeRef = useRef(null)

  const methods = settings?.paymentMethodsEnabled
    ? ALL_METHODS.filter(m => settings.paymentMethodsEnabled.includes(m.id))
    : ALL_METHODS

  useEffect(() => {
    fetch('/api/checkout/settings').then(r => r.json()).then(setSettings).catch(() => {})
  }, [])

  async function handleProceed() {
    if (!selected) return
    if (selected === 'email' || selected === 'stripe') return setStep(selected)
    if (selected === 'paypal') {
      setPaypalError('')
      setPaid(false)

      if (plan.paypal_link) {
        const headers = { 'Content-Type': 'application/json' }
        if (userToken) headers['Authorization'] = `Bearer ${userToken}`
        const res = await fetch('/api/checkout/direct', {
          method: 'POST',
          headers,
          body: JSON.stringify({ planId: plan.id, planName: plan.plan_name }),
        })
        const data = await res.json()
        if (data.error === 'not_configured') {
          setPaypalError(t('notConfigured'))
          return
        }
        setCheckoutUrl(data.checkoutUrl || '')
        setIframeError(false)
      } else if (settings?.paypalEmail) {
        setCheckoutUrl('')
      } else {
        setPaypalError(t('paypalNotConfigured'))
        return
      }
    }
    setStep(selected)
  }

  async function handleSendLink(e) {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/checkout/send-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, email: email.trim() }),
      })
      const data = await res.json()
      if (data.success) { setSent(true); setSentUrl(data.paymentUrl || '') }
      else alert(data.error || t('failedToSend'))
    } catch {
      alert(t('networkError'))
    } finally {
      setSending(false)
    }
  }

  function copy(text, key) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  function reset() {
    setStep('methods')
    setSelected(null)
    setEmail('')
    setSent(false)
    setPaypalError('')
    setSentUrl('')
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 2000,
    }}>
      <div style={{
        background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 16,
        padding: 28, maxWidth: 460, width: '90%', position: 'relative',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 12, right: 16, background: 'transparent',
          border: 'none', color: '#a0a0a0', cursor: 'pointer', fontSize: 22,
        }}>✕</button>

        {step === 'methods' && (
          <>
            <h2 style={{ margin: '0 0 4px', fontSize: 20, color: '#00d4ff' }}>{t('completePurchase')}</h2>
            <p style={{ color: '#a0a0a0', fontSize: 13, margin: '0 0 16px' }}>
              {plan.provider_name} — {plan.plan_name}
            </p>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#00d4ff', marginBottom: 20 }}>
              {lang === 'fr' ? '€' : '$'}{plan.price_sell}
              <span style={{ fontSize: 14, color: '#666', fontWeight: 400 }}> / {plan.duration_days}d</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {methods.map(m => (
                <button key={m.id} onClick={() => setSelected(m.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                  background: selected === m.id ? '#00d4ff20' : '#0f0f0f',
                  border: selected === m.id ? '1.5px solid #00d4ff' : '1px solid #2a2a2a',
                  borderRadius: 10, cursor: 'pointer', color: '#fff', fontSize: 14,
                  textAlign: 'left', transition: 'all 0.15s',
                }}>
                  <span style={{ fontSize: 20, width: 32, textAlign: 'center' }}>{m.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600 }}>{m.label}</div>
                    <div style={{ color: '#666', fontSize: 12 }}>{m.desc}</div>
                  </div>
                  {selected === m.id && <span style={{ marginLeft: 'auto', color: '#00d4ff' }}>✓</span>}
                </button>
              ))}
            </div>
            <button onClick={handleProceed} disabled={!selected} style={{
              width: '100%', padding: '12px', background: selected ? '#00d4ff' : '#2a2a2a',
              color: selected ? '#000' : '#666', border: 'none', borderRadius: 8,
              fontWeight: 700, cursor: selected ? 'pointer' : 'default', fontSize: 15,
            }}>
              {selected === 'email' ? t('continue') : t('proceedToPayment')}
            </button>
          </>
        )}

        {step === 'paypal' && !paid && (
          <>
            <h2 style={{ margin: '0 0 12px', fontSize: 18, color: '#00d4ff' }}>{t('paypalCheckout')}</h2>
            {paypalError && (
              <div style={{ background: '#ff444420', border: '1px solid #ff4444', borderRadius: 8, padding: 12, marginBottom: 12, color: '#ff4444', fontSize: 13, textAlign: 'center' }}>
                {paypalError}
              </div>
            )}
            {checkoutUrl && !iframeError ? (
              <div style={{ marginBottom: 12, borderRadius: 10, overflow: 'hidden', border: '1px solid #2a2a2a' }}>
                <iframe ref={iframeRef} src={checkoutUrl} title="PayPal Checkout"
                  style={{ width: '100%', height: 400, border: 'none' }}
                  onError={() => setIframeError(true)}
                  sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
                />
              </div>
            ) : checkoutUrl ? (
              <div style={{ textAlign: 'center', padding: 20, background: '#0f0f0f', borderRadius: 10, marginBottom: 16 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>💳</div>
                <p style={{ color: '#a0a0a0', fontSize: 13, marginBottom: 12 }}>
                  {iframeError ? t('embedError') : t('loadingCheckout')}
                </p>
                {checkoutUrl && (
                  <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" style={{
                    display: 'inline-block', padding: '10px 24px', background: '#00d4ff', color: '#000',
                    borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: 14,
                  }}>{t('openPaypal')}</a>
                )}
              </div>
            ) : settings?.paypalEmail ? (
              <div style={{ background: '#0f0f0f', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <p style={{ color: '#a0a0a0', fontSize: 13, marginBottom: 12 }}>
                  {t('sendPaypal')}
                </p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <code style={{ flex: 1, color: '#a0a0a0', fontSize: 13, wordBreak: 'break-all' }}>
                    {settings.paypalEmail}
                  </code>
                  <button onClick={() => copy(settings.paypalEmail, 'paypal_email')} style={{
                    background: 'transparent', border: '1px solid #333', borderRadius: 6,
                    padding: '6px 14px', color: copied === 'paypal_email' ? '#00cc66' : '#00d4ff',
                    cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap',
                  }}>
                    {copied === 'paypal_email' ? t('copied') : t('copy')}
                  </button>
                </div>
              </div>
            ) : null}
            <button onClick={() => setPaid(true)} style={{
              width: '100%', padding: '12px', background: '#00cc66', color: '#000',
              border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 15, marginBottom: 8,
            }}>{t('completedPayment')}</button>
            <button onClick={reset} style={{
              width: '100%', padding: '10px', background: 'transparent', color: '#00d4ff',
              border: '1px solid #00d4ff', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14,
            }}>{t('backToMethods')}</button>
          </>
        )}

        {step === 'paypal' && paid && (
          <>
            <div style={{ textAlign: 'center', padding: '30px 20px' }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
              <h2 style={{ margin: '0 0 8px', fontSize: 22, color: '#00cc66' }}>{t('paymentSuccessful')}</h2>
              <p style={{ color: '#a0a0a0', fontSize: 14, margin: '0 0 4px' }}>
                {plan.provider_name} — {plan.plan_name}
              </p>
              <p style={{ color: '#666', fontSize: 13, margin: '0 0 24px' }}>
                {lang === 'fr' ? '€' : '$'}{plan.price_sell}
              </p>
              <p style={{ color: '#a0a0a0', fontSize: 13, margin: '0 0 20px' }}>
                {t('credentialsSent')}
              </p>
              <button onClick={onClose} style={{
                padding: '12px 36px', background: '#00d4ff', color: '#000',
                border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 15,
              }}>{t('done')}</button>
            </div>
          </>
        )}

        {step === 'stripe' && (
          <>
            <h2 style={{ margin: '0 0 12px', fontSize: 18, color: '#00d4ff' }}>{t('stripePayment')}</h2>
            {!sent ? (
              <form onSubmit={async (e) => {
                e.preventDefault()
                if (!email.trim()) return
                setSending(true)
                try {
                  const res = await fetch('/api/checkout/stripe-checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ planId: plan.id, email: email.trim() }),
                  })
                  const data = await res.json()
                  if (data.url) {
                    window.location.href = data.url
                  } else {
                    alert(data.error || t('failedToSend'))
                  }
                } catch {
                  alert(t('networkError'))
                } finally {
                  setSending(false)
                }
              }}>
                <p style={{ color: '#a0a0a0', fontSize: 13, margin: '0 0 16px' }}>
                  {t('stripeDesc')}
                </p>
                <div style={{ background: '#0f0f0f', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                  {settings?.stripePublishableKey && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>{t('amount')} <strong style={{ color: '#fff' }}>{lang === 'fr' ? '€' : '$'}{plan.price_sell}</strong></div>
                    </div>
                  )}
                </div>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder={t('emailPlaceholder')} required
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #333',
                    background: '#0f0f0f', color: '#fff', fontSize: 14, outline: 'none',
                    boxSizing: 'border-box', marginBottom: 12,
                  }} />
                <button type="submit" disabled={sending || !email.trim()} style={{
                  width: '100%', padding: '12px', background: '#00d4ff', color: '#000',
                  border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 15,
                  opacity: sending || !email.trim() ? 0.6 : 1,
                }}>
                  {sending ? t('sending') : t('proceedToPayment')}
                </button>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>💳</div>
                <p style={{ color: '#00cc66', fontWeight: 700, marginBottom: 4 }}>{t('paymentSuccessful')}</p>
                <p style={{ color: '#a0a0a0', fontSize: 13, margin: '0 0 16px' }}>{t('credentialsSent')}</p>
              </div>
            )}
            <button onClick={reset} style={{
              width: '100%', padding: '10px', marginTop: 12, background: 'transparent',
              color: '#00d4ff', border: '1px solid #00d4ff', borderRadius: 8,
              fontWeight: 600, cursor: 'pointer', fontSize: 14,
            }}>{t('backToMethods')}</button>
          </>
        )}

        {step === 'email' && (
          <>
            <h2 style={{ margin: '0 0 12px', fontSize: 18, color: '#00d4ff' }}>{t('emailPaymentLink')}</h2>
            {!sent ? (
              <form onSubmit={handleSendLink}>
                <p style={{ color: '#a0a0a0', fontSize: 13, margin: '0 0 16px' }}>
                  {t('emailDesc2')}
                </p>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder={t('emailPlaceholder')} required
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #333',
                    background: '#0f0f0f', color: '#fff', fontSize: 14, outline: 'none',
                    boxSizing: 'border-box', marginBottom: 12,
                  }} />
                <button type="submit" disabled={sending || !email.trim()} style={{
                  width: '100%', padding: '12px', background: '#00d4ff', color: '#000',
                  border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 15,
                  opacity: sending || !email.trim() ? 0.6 : 1,
                }}>
                  {sending ? t('sending') : t('sendPaymentLink')}
                </button>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>📧</div>
                <p style={{ color: '#00cc66', fontWeight: 700, marginBottom: 4 }}>{t('paymentLinkSent')}</p>
                <p style={{ color: '#a0a0a0', fontSize: 13, margin: '0 0 16px' }}>{t('checkInbox')} <strong style={{ color: '#fff' }}>{email}</strong></p>
                {sentUrl && (
                  <div style={{ background: '#0f0f0f', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                    <p style={{ color: '#666', fontSize: 12, marginBottom: 6 }}>{t('orOpen')}</p>
                    <a href={sentUrl} target="_blank" rel="noopener noreferrer" style={{
                      display: 'block', color: '#00d4ff', wordBreak: 'break-all', fontSize: 13, textDecoration: 'underline',
                    }}>{sentUrl}</a>
                    <button onClick={() => { navigator.clipboard.writeText(sentUrl); setCopied('url') }} style={{
                      marginTop: 8, background: 'transparent', border: '1px solid #333', borderRadius: 6,
                      padding: '6px 14px', color: copied === 'url' ? '#00cc66' : '#00d4ff',
                      cursor: 'pointer', fontSize: 12,
                    }}>{copied === 'url' ? t('copied') : t('copyLink')}</button>
                  </div>
                )}
              </div>
            )}
            <button onClick={reset} style={{
              width: '100%', padding: '10px', marginTop: 12, background: 'transparent',
              color: '#00d4ff', border: '1px solid #00d4ff', borderRadius: 8,
              fontWeight: 600, cursor: 'pointer', fontSize: 14,
            }}>{t('backToMethods')}</button>
          </>
        )}

        {step === 'crypto' && (
          <>
            <h2 style={{ margin: '0 0 12px', fontSize: 18, color: '#00d4ff' }}>{t('cryptoPayment')}</h2>
            <p style={{ color: '#a0a0a0', fontSize: 13, margin: '0 0 16px' }}>
              {t('cryptoDesc')}
            </p>
            {settings?.crypto?.usdt && (
              <div style={{ background: '#0f0f0f', borderRadius: 10, padding: 16, marginBottom: 12 }}>
                <div style={{ color: '#00d4ff', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{t('usdt')}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <code style={{ flex: 1, color: '#a0a0a0', fontSize: 12, wordBreak: 'break-all' }}>
                    {settings.crypto.usdt}
                  </code>
                  <button onClick={() => copy(settings.crypto.usdt, 'usdt')} style={{
                    background: 'transparent', border: '1px solid #333', borderRadius: 6,
                    padding: '4px 10px', color: copied === 'usdt' ? '#00cc66' : '#00d4ff',
                    cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap',
                  }}>
                    {copied === 'usdt' ? t('copied') : t('copy')}
                  </button>
                </div>
              </div>
            )}
            {settings?.crypto?.btc && (
              <div style={{ background: '#0f0f0f', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <div style={{ color: '#ffaa00', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{t('btc')}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <code style={{ flex: 1, color: '#a0a0a0', fontSize: 12, wordBreak: 'break-all' }}>
                    {settings.crypto.btc}
                  </code>
                  <button onClick={() => copy(settings.crypto.btc, 'btc')} style={{
                    background: 'transparent', border: '1px solid #333', borderRadius: 6,
                    padding: '4px 10px', color: copied === 'btc' ? '#00cc66' : '#00d4ff',
                    cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap',
                  }}>
                    {copied === 'btc' ? t('copied') : t('copy')}
                  </button>
                </div>
              </div>
            )}
            {!settings?.crypto?.usdt && !settings?.crypto?.btc && (
              <p style={{ color: '#666', textAlign: 'center', padding: 20 }}>
                {t('cryptoNotConfigured')}
              </p>
            )}
            <button onClick={reset} style={{
              width: '100%', padding: '10px', background: 'transparent', color: '#00d4ff',
              border: '1px solid #00d4ff', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14,
            }}>{t('backToMethods')}</button>
          </>
        )}

        {step === 'sepa' && (
          <>
            <h2 style={{ margin: '0 0 12px', fontSize: 18, color: '#00d4ff' }}>{t('sepaPayment')}</h2>
            <p style={{ color: '#a0a0a0', fontSize: 13, margin: '0 0 16px' }}>
              {t('sepaDesc2')}
            </p>
            <div style={{ background: '#0f0f0f', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              {[
                { label: t('sepaAmount'), value: `${lang === 'fr' ? '€' : '$'}${plan.price_sell}` },
                { label: t('sepaIban'), value: settings?.sepa?.iban, key: 'iban' },
                { label: t('sepaBic'), value: settings?.sepa?.bic, key: 'bic' },
                { label: t('sepaBank'), value: settings?.sepa?.bank, key: 'bank' },
                { label: t('reference'), value: `Order #${Date.now().toString(36).toUpperCase()}` },
              ].map(item => item.value ? (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1a1a1a' }}>
                  <span style={{ color: '#666', fontSize: 12 }}>{item.label}</span>
                  <span style={{ color: '#fff', fontSize: 13, fontWeight: 600, textAlign: 'right', wordBreak: 'break-all' }}>{item.value}</span>
                </div>
              ) : null)}
            </div>
            {!settings?.sepa?.iban && (
              <p style={{ color: '#666', textAlign: 'center', padding: 20 }}>
                {t('sepaNotConfigured')}
              </p>
            )}
            <button onClick={reset} style={{
              width: '100%', padding: '10px', background: 'transparent', color: '#00d4ff',
              border: '1px solid #00d4ff', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14,
            }}>{t('backToMethods')}</button>
          </>
        )}
      </div>
    </div>
  )
}
