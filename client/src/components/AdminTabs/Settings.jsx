import { useState, useEffect } from 'react'
import api from '../../api'

const AI_PROVIDERS = [
  { key: 'groq', name: 'Groq', icon: '⚡', badge: 'Free Tier', defaultModel: 'llama-3.3-70b-versatile' },
  { key: 'gemini', name: 'Google Gemini', icon: '🧠', badge: 'Free Tier', defaultModel: 'gemini-2.0-flash' },
  { key: 'deepseek', name: 'DeepSeek', icon: '🔍', badge: 'Cheap', defaultModel: 'deepseek-chat' },
  { key: 'kimi', name: 'Kimi', icon: '🌙', badge: '128K Context', defaultModel: 'moonshot-v1-8k' },
  { key: 'openrouter', name: 'OpenRouter', icon: '🔀', badge: 'Free Tier', defaultModel: 'gpt-3.5-turbo' },
  { key: 'openai', name: 'OpenAI', icon: '💬', badge: '', defaultModel: 'gpt-4o-mini' },
  { key: 'anthropic', name: 'Anthropic', icon: '🌲', badge: '', defaultModel: 'claude-3-haiku-20240307' },
  { key: 'custom', name: 'Custom API', icon: '🔌', badge: '', defaultModel: '' },
]

const TASK_INFO = `
Chat (Alex Agent) → Groq > Gemini > OpenRouter > OpenAI > DeepSeek > Kimi > Anthropic
SEO Audit → Gemini > OpenRouter > OpenAI > Groq > DeepSeek > Kimi > Anthropic
Page Builder → Anthropic > OpenAI > Gemini > OpenRouter > Groq > DeepSeek > Kimi
`.trim()

export default function Settings() {
  const [settings, setSettings] = useState({})
  const [edit, setEdit] = useState({})
  const [testResults, setTestResults] = useState({})
  const [loadingTests, setLoadingTests] = useState({})
  const [savedAt, setSavedAt] = useState(null)
  const [saveStatus, setSaveStatus] = useState(null)
  const [savingKeys, setSavingKeys] = useState({})
  const [showKeys, setShowKeys] = useState({})
  const [aiStatus, setAiStatus] = useState({})

  useEffect(() => {
    api.get('/admin/settings').then(r => {
      setSettings(r.data)
      setEdit(r.data)
      setSavedAt(new Date())
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (Object.keys(settings).length > 0) {
      const saved = AI_PROVIDERS.filter(p => settings[`ai_key_${p.key}`])
      let i = 0
      const fn = () => {
        if (i < saved.length) {
          testAiProvider(saved[i].key)
          i++
          setTimeout(fn, 2000)
        }
      }
      fn()
    }
  }, [settings])

  function saveKey(key) {
    setSavingKeys(s => ({ ...s, [key]: true }))
    api.put('/admin/settings', { [key]: edit[key] }).then(() => {
      setSettings(s => ({ ...s, [key]: edit[key] }))
      setSavingKeys(s => ({ ...s, [key]: false }))
      setSavedAt(new Date())
    }).catch(() => {
      setSavingKeys(s => ({ ...s, [key]: false }))
    })
  }

  function saveKeys(keys) {
    const payload = {}
    for (const k of keys) payload[k] = edit[k]
    for (const k of keys) setSavingKeys(s => ({ ...s, [k]: true }))
    return api.put('/admin/settings', payload).then(() => {
      setSettings(s => ({ ...s, ...payload }))
      for (const k of keys) setSavingKeys(s => ({ ...s, [k]: false }))
      setSavedAt(new Date())
    }).catch(() => {
      for (const k of keys) setSavingKeys(s => ({ ...s, [k]: false }))
    })
  }

  function save() {
    setSaveStatus('saving')
    api.put('/admin/settings', edit).then(() => {
      setSettings({ ...edit })
      setSavedAt(new Date())
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(null), 3000)
    }).catch(() => {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus(null), 3000)
    })
  }

  function isDirty(key) {
    return edit[key] !== settings[key]
  }

  function isSaved(key) {
    return settings[key] && settings[key].length > 0
  }

  function testEmail() {
    const email = edit.support_email || edit.smtp_from_email
    if (!email) return alert('Set a support email first')
    setLoadingTests(s => ({ ...s, email: true }))
    setTestResults(t => ({ ...t, email: '' }))
    api.post('/admin/settings/test-email', { email }).then(r => {
      setTestResults(t => ({ ...t, email: r.data.success ? '✅ Email sent!' : '❌ ' + (r.data.error || 'Failed') }))
    }).catch(() => setTestResults(t => ({ ...t, email: '❌ Request failed' })))
      .finally(() => setLoadingTests(s => ({ ...s, email: false })))
  }

  function testNamecheapConn() {
    setLoadingTests(s => ({ ...s, namecheap: true }))
    setTestResults(t => ({ ...t, namecheap: '' }))
    api.post('/admin/settings/test-namecheap').then(r => {
      setTestResults(t => ({ ...t, namecheap: r.data.success ? '✅ ' + (r.data.message || 'OK') : '❌ ' + (r.data.error || 'Failed') }))
    }).catch(() => setTestResults(t => ({ ...t, namecheap: '❌ Request failed' })))
      .finally(() => setLoadingTests(s => ({ ...s, namecheap: false })))
  }

  function testSellup() {
    setLoadingTests(s => ({ ...s, sellup: true }))
    setTestResults(t => ({ ...t, sellup: '' }))
    api.post('/admin/settings/test-sellup').then(r => {
      setTestResults(t => ({ ...t, sellup: r.data.success ? '✅ OK' : '❌ ' + (r.data.error || 'Check API key') }))
    }).catch(() => setTestResults(t => ({ ...t, sellup: '❌ Request failed' })))
      .finally(() => setLoadingTests(s => ({ ...s, sellup: false })))
  }

  function testPaypal() {
    setLoadingTests(s => ({ ...s, paypal: true }))
    setTestResults(t => ({ ...t, paypal: '' }))
    api.post('/admin/settings/test-paypal').then(r => {
      setTestResults(t => ({ ...t, paypal: r.data.success ? '✅ ' + (r.data.message || 'OK') : '❌ ' + (r.data.error || 'Check credentials') }))
    }).catch(() => setTestResults(t => ({ ...t, paypal: '❌ Request failed' })))
      .finally(() => setLoadingTests(s => ({ ...s, paypal: false })))
  }

  function testAI() {
    setLoadingTests(s => ({ ...s, ai: true }))
    setTestResults(t => ({ ...t, ai: '' }))
    api.post('/admin/settings/test-ai').then(r => {
      setTestResults(t => ({ ...t, ai: r.data.success ? '✅ ' + r.data.message : '❌ ' + (r.data.error || 'Check API key') }))
    }).catch(() => setTestResults(t => ({ ...t, ai: '❌ Request failed' })))
      .finally(() => setLoadingTests(s => ({ ...s, ai: false })))
  }

  function testAiProvider(providerKey) {
    setAiStatus(s => ({ ...s, [providerKey]: { status: 'checking', message: '' } }))
    api.post(`/admin/settings/test-ai/${providerKey}`).then(r => {
      setAiStatus(s => ({ ...s, [providerKey]: { status: r.data.success ? 'connected' : 'failed', message: r.data.success ? r.data.message : r.data.error } }))
    }).catch(() => {
      setAiStatus(s => ({ ...s, [providerKey]: { status: 'failed', message: 'Request failed' } }))
    })
  }

  function saveKeysWithTest(keys, providerKey) {
    saveKeys(keys).then(() => testAiProvider(providerKey))
  }

  function update(key, value) {
    setEdit(e => ({ ...e, [key]: value }))
  }

  const localeLabel = { en: 'English', fr: 'Français', nl: 'Nederlands' }

  const sections = [
    {
      title: 'SMTP Configuration',
      fields: [
        { key: 'smtp_host', label: 'SMTP Host', type: 'text' },
        { key: 'smtp_port', label: 'SMTP Port', type: 'text' },
        { key: 'smtp_user', label: 'SMTP Username', type: 'text' },
        { key: 'smtp_pass', label: 'SMTP Password', type: 'password' },
        { key: 'smtp_from_name', label: 'From Name', type: 'text' },
        { key: 'smtp_from_email', label: 'From Email', type: 'text' },
      ],
      test: { label: 'Test Email', onClick: testEmail, resultKey: 'email' },
    },
    {
      title: 'Sellup.io',
      fields: [
        { key: 'sellup_api_key', label: 'API Key', type: 'password' },
        { key: 'sellup_store_id', label: 'Store ID', type: 'text' },
        { key: 'sellup_webhook_secret', label: 'Webhook Secret', type: 'password' },
      ],
      test: { label: 'Test Sellup', onClick: testSellup, resultKey: 'sellup' },
    },
    {
      title: 'Namecheap API',
      fields: [
        { key: 'namecheap_api_user', label: 'API User', type: 'text' },
        { key: 'namecheap_api_key', label: 'API Key', type: 'password' },
        { key: 'namecheap_username', label: 'Username', type: 'text' },
        { key: 'namecheap_client_ip', label: 'Client IP', type: 'text' },
      ],
      test: { label: 'Test Namecheap', onClick: testNamecheapConn, resultKey: 'namecheap' },
    },
    {
      title: 'Payment Methods',
      fields: [
        { key: 'paypal_email', label: 'PayPal Friends & Family Email', type: 'text', optional: true },
        { key: 'paypal_client_id', label: 'PayPal Client ID (REST API)', type: 'text', optional: true },
        { key: 'paypal_client_secret', label: 'PayPal Client Secret', type: 'password', optional: true },
        { key: 'paypal_mode', label: 'PayPal Mode', type: 'select', options: ['sandbox', 'live'], optional: true },
        { key: 'stripe_publishable_key', label: 'Stripe Publishable Key', type: 'text', optional: true },
        { key: 'stripe_secret_key', label: 'Stripe Secret Key', type: 'password', optional: true },
        { key: 'crypto_address_usdt', label: 'USDT (TRC20) Address', type: 'text', optional: true },
        { key: 'crypto_address_btc', label: 'Bitcoin (BTC) Address', type: 'text', optional: true },
        { key: 'sepa_iban', label: 'SEPA IBAN', type: 'text', optional: true },
        { key: 'sepa_bic', label: 'SEPA BIC/SWIFT', type: 'text', optional: true },
        { key: 'sepa_bank_name', label: 'SEPA Bank Name', type: 'text', optional: true },
      ],
      test: { label: 'Test PayPal Connection', onClick: testPaypal, resultKey: 'paypal' },
    },
    {
      title: 'Business Info',
      fields: [
        { key: 'site_name', label: 'Site Name', type: 'text', optional: true },
        { key: 'site_url', label: 'Site URL', type: 'text', optional: true },
        { key: 'support_email', label: 'Support Email', type: 'text' },
        { key: 'whatsapp_number', label: 'WhatsApp Number', type: 'text', optional: true, placeholder: '+33612345678' },
        { key: 'google_client_id', label: 'Google OAuth Client ID', type: 'text', optional: true },
        { key: 'apple_client_id', label: 'Apple Sign In Service ID', type: 'text', optional: true },
      ],
    },
    {
      title: '🔔 Notifications',
      fields: [
        { key: 'admin_email', label: 'Admin Email (receive alerts)', type: 'email' },
        { key: 'admin_phone', label: 'WhatsApp Phone (via CallMeBot)', type: 'text', optional: true, placeholder: '+212600000000' },
        { key: 'telegram_bot_token', label: 'Telegram Bot Token', type: 'password', optional: true, placeholder: '123456:ABC-DEF...' },
        { key: 'telegram_chat_id', label: 'Telegram Chat ID', type: 'text', optional: true },
      ],
    },
  ]

  return (
    <div>
      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: '#00d4ff' }}>Dashboard Language</h3>
          {isDirty('admin_language') && <span style={{ color: '#ffaa00', fontSize: 13 }}>✦ Unsaved</span>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={edit.admin_language || 'en'} onChange={e => update('admin_language', e.target.value)} style={{
            flex: 1, ...inputStyle, borderColor: isDirty('admin_language') ? '#ffaa00' : '#2a2a2a',
          }}>
            <option value="en">🇬🇧 English</option>
            <option value="fr">🇫🇷 Français</option>
            <option value="nl">🇳🇱 Nederlands</option>
          </select>
          {isDirty('admin_language') && (
            <button onClick={() => saveKey('admin_language')} disabled={savingKeys['admin_language']} style={{
              padding: '10px 16px', background: savingKeys['admin_language'] ? '#2a2a2a' : '#ffaa00',
              color: savingKeys['admin_language'] ? '#666' : '#000', border: 'none', borderRadius: 8,
              fontWeight: 600, cursor: savingKeys['admin_language'] ? 'default' : 'pointer', fontSize: 12,
            }}>
              {savingKeys['admin_language'] ? '...' : 'Save'}
            </button>
          )}
        </div>
        <p style={{ color: '#666', fontSize: 12, marginTop: 8 }}>Current: <strong>{localeLabel[edit.admin_language || 'en']}</strong></p>
      </div>

      {sections.map(section => {
        const allSaved = section.fields.every(f => !f.optional ? isSaved(f.key) : true)
        const anyDirty = section.fields.some(f => isDirty(f.key))
        return (
        <div key={section.title} style={{
          background: '#1a1a1a', border: '1px solid', borderColor: anyDirty ? '#ffaa0044' : '#2a2a2a',
          borderRadius: 12, padding: 20, marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, color: '#00d4ff' }}>{section.title}</h3>
            {allSaved && <span style={{ color: '#00cc66', fontSize: 13 }}>✓ Saved</span>}
            {anyDirty && <span style={{ color: '#ffaa00', fontSize: 13 }}>⚠ Unsaved changes</span>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {section.fields.map(f => {
              const dirty = isDirty(f.key)
              const filled = isSaved(f.key)
              return (
              <div key={f.key}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#a0a0a0', fontSize: 13, marginBottom: 4 }}>
                  {f.label}
                  {filled && !dirty && <span style={{ color: '#00cc66', fontSize: 11 }}>✓</span>}
                  {dirty && <span style={{ color: '#ffaa00', fontSize: 11 }}>✦</span>}
                </label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  {f.type === 'select' ? (
                    <select value={edit[f.key] || ''} onChange={e => update(f.key, e.target.value)} style={{
                      flex: 1,
                      ...inputStyle,
                      appearance: 'none',
                      borderColor: dirty ? '#ffaa00' : filled ? '#00cc6644' : '#2a2a2a',
                    }}>
                      {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : f.type === 'password' ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1 }}>
                      <input
                        type={showKeys[f.key] ? 'text' : 'password'} value={edit[f.key] || ''}
                        onChange={e => update(f.key, e.target.value)}
                        placeholder={filled ? '••••••••' : 'Not set'}
                        style={{ flex: 1, ...inputStyle, borderColor: dirty ? '#ffaa00' : filled ? '#00cc6644' : '#2a2a2a' }}
                      />
                      <button onClick={() => setShowKeys(s => ({ ...s, [f.key]: !s[f.key] }))}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, padding: '4px 6px', color: filled ? '#00cc66' : '#666' }}
                        title={showKeys[f.key] ? 'Hide' : 'Show'}>
                        {showKeys[f.key] ? '🙈' : '👁️'}
                      </button>
                    </div>
                  ) : (
                  <input
                    type={f.type} value={edit[f.key] || ''}
                    onChange={e => update(f.key, e.target.value)}
                    placeholder={filled ? '' : 'Not set'}
                    style={{
                      flex: 1,
                      ...inputStyle,
                      borderColor: dirty ? '#ffaa00' : filled ? '#00cc6644' : '#2a2a2a',
                    }}
                  />
                  )}
                  {dirty && (
                    <button onClick={() => saveKey(f.key)} disabled={savingKeys[f.key]} style={{
                      padding: '10px 16px', background: savingKeys[f.key] ? '#2a2a2a' : '#ffaa00',
                      color: savingKeys[f.key] ? '#666' : '#000', border: 'none',
                      borderRadius: 8, fontWeight: 600, cursor: savingKeys[f.key] ? 'default' : 'pointer',
                      fontSize: 12, whiteSpace: 'nowrap', alignSelf: 'flex-start',
                    }}>
                      {savingKeys[f.key] ? '...' : 'Save'}
                    </button>
                  )}
                </div>
              </div>
            )})}
          </div>
          {section.title === 'Payment Methods' && (
            <div style={{ marginTop: 16, borderTop: '1px solid #2a2a2a', paddingTop: 16 }}>
              <label style={{ color: '#a0a0a0', fontSize: 13, marginBottom: 10, display: 'block' }}>
                Enable / Disable Payment Methods
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { id: 'paypal', label: 'PayPal', desc: 'Pay with PayPal or credit card' },
                  { id: 'stripe', label: 'Stripe', desc: 'Credit/debit card via Stripe' },
                  { id: 'crypto', label: 'Crypto', desc: 'USDT (TRC20) or BTC' },
                  { id: 'email', label: 'Email Link', desc: 'Receive a payment link via email' },
                  { id: 'sepa', label: 'SEPA Transfer', desc: 'Bank transfer within EU' },
                ].map(m => {
                  let enabled = ['paypal', 'stripe', 'crypto', 'email', 'sepa'];
                  try { enabled = JSON.parse(edit.payment_methods_enabled || '[]'); } catch {}
                  const isOn = enabled.includes(m.id)
                  return (
                    <label key={m.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                      background: '#0f0f0f', borderRadius: 8, cursor: 'pointer',
                      border: '1px solid', borderColor: isOn ? '#00cc6644' : '#2a2a2a',
                    }}>
                      <div onClick={() => {
                        let arr = []
                        try { arr = JSON.parse(edit.payment_methods_enabled || '[]'); } catch {}
                        if (arr.includes(m.id)) {
                          arr = arr.filter(x => x !== m.id)
                        } else {
                          arr.push(m.id)
                        }
                        const json = JSON.stringify(arr)
                        update('payment_methods_enabled', json)
                        api.put('/admin/settings', { payment_methods_enabled: json }).then(() => {
                          setSettings(s => ({ ...s, payment_methods_enabled: json }))
                        })
                      }} style={{
                        width: 40, height: 22, borderRadius: 11, position: 'relative',
                        background: isOn ? '#00cc66' : '#333', cursor: 'pointer', transition: '0.15s', flexShrink: 0,
                      }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: '50%', background: '#fff',
                          position: 'absolute', top: 2, transition: '0.15s',
                          left: isOn ? 20 : 2,
                        }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: isOn ? '#fff' : '#666' }}>{m.label}</div>
                        <div style={{ fontSize: 11, color: '#555' }}>{m.desc}</div>
                      </div>
                      {isOn && <span style={{ color: '#00cc66', fontSize: 12 }}>Visible</span>}
                      {!isOn && <span style={{ color: '#666', fontSize: 12 }}>Hidden</span>}
                    </label>
                  )
                })}
              </div>
            </div>
          )}
          {section.test && (
            <div style={{ marginTop: 12 }}>
              <button onClick={section.test.onClick} disabled={loadingTests[section.test.resultKey]} style={{ ...btnStyle, opacity: loadingTests[section.test.resultKey] ? 0.5 : 1, cursor: loadingTests[section.test.resultKey] ? 'default' : 'pointer' }}>
                {loadingTests[section.test.resultKey] ? '⏳ Testing...' : section.test.label}
              </button>
              {testResults[section.test.resultKey] && (
                <span style={{ marginLeft: 12, fontSize: 13, color: testResults[section.test.resultKey].startsWith('✅') ? '#00cc66' : '#ff4444' }}>
                  {testResults[section.test.resultKey]}
                </span>
              )}
            </div>
          )}
        </div>
      )})}

      <div style={{
        background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 20, marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: '#00d4ff' }}>AI Providers</h3>
          {AI_PROVIDERS.some(p => settings[`ai_key_${p.key}`]) && <span style={{ color: '#00cc66', fontSize: 13 }}>✓ Configured</span>}
        </div>
        <p style={{ color: '#666', fontSize: 12, marginBottom: 16, whiteSpace: 'pre-wrap', fontFamily: 'JetBrains Mono, monospace', background: '#0f0f0f', padding: 12, borderRadius: 8 }}>
          {TASK_INFO}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {AI_PROVIDERS.map(p => {
            const keySaved = settings[`ai_key_${p.key}`] && settings[`ai_key_${p.key}`].length > 0
            const keyDirty = isDirty(`ai_key_${p.key}`)
            return (
            <div key={p.key} style={{
              background: '#0f0f0f', border: '1px solid', borderColor: keyDirty ? '#ffaa0044' : keySaved ? '#00cc6644' : '#2a2a2a',
              borderRadius: 10, padding: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 18 }}>{p.icon}</span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</span>
                {p.badge && (
                  <span style={{
                    background: p.badge === 'Free Tier' ? '#00cc6620' : '#ffaa0020',
                    color: p.badge === 'Free Tier' ? '#00cc66' : '#ffaa00',
                    fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                  }}>{p.badge}</span>
                )}
                {keySaved && !keyDirty && <span style={{ marginLeft: 'auto', color: '#00cc66', fontSize: 12 }}>✓ Saved</span>}
                {keyDirty && <span style={{ marginLeft: 'auto', color: '#ffaa00', fontSize: 12 }}>✦ Unsaved</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#666', fontSize: 12, marginBottom: 3 }}>
                    API Key
                    {keySaved && !keyDirty && <span style={{ color: '#00cc66', fontSize: 11 }}>✓</span>}
                    {keyDirty && <span style={{ color: '#ffaa00', fontSize: 11 }}>✦</span>}
                  </label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type={showKeys[p.key] ? 'text' : 'password'} value={edit[`ai_key_${p.key}`] || ''}
                      onChange={e => update(`ai_key_${p.key}`, e.target.value)}
                      placeholder={keySaved ? '••••••••' : (p.key === 'anthropic' ? 'sk-ant-...' : 'Paste your API key')}
                      style={{
                        flex: 1, ...inputStyle,
                        borderColor: keyDirty ? '#ffaa00' : keySaved ? '#00cc6644' : '#2a2a2a',
                      }} />
                    <button onClick={() => setShowKeys(s => ({ ...s, [p.key]: !s[p.key] }))}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, padding: '4px 6px', color: keySaved ? '#00cc66' : '#666' }}
                      title={showKeys[p.key] ? 'Hide' : 'Show'}>
                      {showKeys[p.key] ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#666', fontSize: 12, marginBottom: 3 }}>
                    Model <span style={{ color: '#444' }}>(optional)</span>
                    {settings[`ai_model_${p.key}`] && !isDirty(`ai_model_${p.key}`) && <span style={{ color: '#00cc66', fontSize: 11 }}>✓</span>}
                    {isDirty(`ai_model_${p.key}`) && <span style={{ color: '#ffaa00', fontSize: 11 }}>✦</span>}
                  </label>
                  <input type="text" value={edit[`ai_model_${p.key}`] || ''}
                    onChange={e => update(`ai_model_${p.key}`, e.target.value)}
                    placeholder={`Default: ${p.defaultModel || 'custom'}`}
                    style={{
                      ...inputStyle,
                      borderColor: isDirty(`ai_model_${p.key}`) ? '#ffaa00' : settings[`ai_model_${p.key}`] ? '#00cc6644' : '#2a2a2a',
                    }} />
                </div>
                {p.key === 'custom' && (
                  <div>
                    <label style={{ display: 'block', color: '#666', fontSize: 12, marginBottom: 3 }}>API URL</label>
                    <input type="text" value={edit['ai_url_custom'] || ''}
                      onChange={e => update('ai_url_custom', e.target.value)}
                      placeholder="https://your-api.com/v1"
                      style={inputStyle} />
                  </div>
                )}
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                  {[`ai_key_${p.key}`, `ai_model_${p.key}`, ...(p.key === 'custom' ? ['ai_url_custom'] : [])].some(k => isDirty(k)) && (
                    <button onClick={() => {
                      const keys = [`ai_key_${p.key}`, `ai_model_${p.key}`]
                      if (p.key === 'custom') keys.push('ai_url_custom')
                      saveKeysWithTest(keys, p.key)
                    }} disabled={savingKeys[`ai_key_${p.key}`]} style={{
                      padding: '8px 20px',
                      background: savingKeys[`ai_key_${p.key}`] ? '#2a2a2a' : '#ffaa00',
                      color: savingKeys[`ai_key_${p.key}`] ? '#666' : '#000',
                      border: 'none', borderRadius: 8, fontWeight: 600,
                      cursor: savingKeys[`ai_key_${p.key}`] ? 'default' : 'pointer',
                      fontSize: 13,
                    }}>{savingKeys[`ai_key_${p.key}`] ? 'Saving...' : `Save ${p.name}`}</button>
                  )}
                  {aiStatus[p.key]?.status === 'checking' && <span style={{ color: '#ffaa00', fontSize: 12 }}>⏳ Testing...</span>}
                  {aiStatus[p.key]?.status === 'connected' && (
                    <span style={{ color: aiStatus[p.key].message.includes('quota') ? '#ffaa00' : '#00cc66', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                      ● {aiStatus[p.key].message}
                    </span>
                  )}
                  {aiStatus[p.key]?.status === 'failed' && (
                    <span style={{ color: '#ff4444', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                      ● {aiStatus[p.key].message}
                      <button onClick={() => testAiProvider(p.key)} style={{
                        background: 'transparent', border: '1px solid #ff444433', borderRadius: 4,
                        padding: '2px 6px', cursor: 'pointer', color: '#ff4444', fontSize: 10, marginLeft: 4,
                      }}>Retry</button>
                    </span>
                  )}
                  {keySaved && !keyDirty && !aiStatus[p.key] && (
                    <button onClick={() => testAiProvider(p.key)} style={{
                      background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 6,
                      padding: '4px 10px', cursor: 'pointer', color: '#a0a0a0', fontSize: 11,
                    }}>
                      Test Connection
                    </button>
                  )}
                </div>
              </div>
            </div>
          )})}
        </div>
        <div style={{ marginTop: 16 }}>
          <button onClick={testAI} disabled={loadingTests.ai} style={{ ...btnStyle, opacity: loadingTests.ai ? 0.5 : 1, cursor: loadingTests.ai ? 'default' : 'pointer' }}>
            {loadingTests.ai ? '⏳ Testing...' : 'Test AI'}
          </button>
          {testResults.ai && (
            <p style={{ margin: '8px 0 0', fontSize: 13, color: testResults.ai.startsWith('✅') ? '#00cc66' : '#ff4444' }}>
              {testResults.ai}
            </p>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={save} style={{
          flex: 1, padding: '12px', background: saveStatus === 'saving' ? '#2a2a2a' : '#00d4ff',
          color: saveStatus === 'saving' ? '#666' : '#000', border: 'none',
          borderRadius: 8, fontWeight: 700, cursor: saveStatus === 'saving' ? 'default' : 'pointer', fontSize: 16,
        }} disabled={saveStatus === 'saving'}>
          {saveStatus === 'saving' ? 'Saving...' : 'Save All Settings'}
        </button>
        {saveStatus === 'saved' && <span style={{ color: '#00cc66', fontWeight: 600, fontSize: 14 }}>✅ Saved</span>}
        {saveStatus === 'error' && <span style={{ color: '#ff4444', fontWeight: 600, fontSize: 14 }}>❌ Save failed</span>}
        {savedAt && (
          <span style={{ color: '#666', fontSize: 12, whiteSpace: 'nowrap' }}>
            Last saved: {savedAt.toLocaleTimeString()}
          </span>
        )}
      </div>

      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#ff4444' }}>Danger Zone</h3>
        <p style={{ color: '#a0a0a0', fontSize: 13, marginBottom: 12 }}>Reset demo data or export all data from the system.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => alert('Export all data — not yet implemented. Use the Codes Export button on the Codes tab.')} style={{ ...btnStyle, background: '#2a2a2a', color: '#fff' }}>
            Export All
          </button>
        </div>
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #2a2a2a',
  background: '#0f0f0f', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box',
}

const btnStyle = {
  padding: '8px 20px', background: '#00d4ff', color: '#000', border: 'none',
  borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13,
}
