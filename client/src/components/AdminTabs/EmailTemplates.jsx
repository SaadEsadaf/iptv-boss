import { useState, useEffect } from 'react'
import api from '../../api'

export default function EmailTemplates() {
  const [templates, setTemplates] = useState([])
  const [plans, setPlans] = useState([])
  const [selectedKey, setSelectedKey] = useState('trial_default')
  const [subject, setSubject] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [variables, setVariables] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [message, setMessage] = useState('')
  const [templateType, setTemplateType] = useState('trial')
  const [scope, setScope] = useState('default')
  const [selectedPlanId, setSelectedPlanId] = useState('')

  useEffect(() => {
    api.get('/admin/email-templates').then(r => {
      setTemplates(r.data.templates)
      setPlans(r.data.plans)
    }).catch(() => setMessage('Failed to load templates'))
  }, [])

  useEffect(() => {
    const key = scope === 'default'
      ? templateType + '_default'
      : templateType + '_plan_' + selectedPlanId
    setSelectedKey(key)
    const t = templates.find(t => t.template_key === key)
    if (t) {
      setSubject(t.subject || '')
      setBodyHtml(t.body_html || '')
      try { setVariables(JSON.parse(t.variables || '[]')) } catch { setVariables([]) }
    } else if (scope === 'default') {
      setSubject('')
      setBodyHtml('')
      setVariables([])
    } else {
      setSubject('')
      setBodyHtml('')
      setVariables([])
    }
    setSaved(false)
  }, [templateType, scope, selectedPlanId, templates])

  function handleSave() {
    setSaving(true)
    setMessage('')
    api.put('/admin/email-templates/' + selectedKey, { subject, body_html, name: selectedKey, variables })
      .then(() => {
        setSaved(true)
        setMessage('Template saved')
        return api.get('/admin/email-templates')
      })
      .then(r => setTemplates(r.data.templates))
      .catch(e => setMessage('Save failed: ' + (e.response?.data?.error || e.message)))
      .finally(() => setSaving(false))
  }

  function handleReset() {
    if (!confirm('Reset to system default?')) return
    api.post('/admin/email-templates/' + selectedKey + '/reset')
      .then(() => api.get('/admin/email-templates'))
      .then(r => setTemplates(r.data.templates))
      .catch(e => setMessage('Reset failed: ' + e.message))
  }

  const currentPlan = plans.find(p => String(p.id) === selectedPlanId)
  const scopeLabel = scope === 'default' ? 'Default' : (currentPlan ? currentPlan.provider_name + ' ' + currentPlan.plan_name : 'Plan')

  const previewHtml = bodyHtml
    .replace(/\{\{customer_name\}\}/g, 'John Doe')
    .replace(/\{\{customer_email\}\}/g, 'john@example.com')
    .replace(/\{\{username\}\}/g, 'trial_user_123')
    .replace(/\{\{password\}\}/g, 'abc123xyz')
    .replace(/\{\{server_url\}\}/g, 'http://iptv.example.com')
    .replace(/\{\{duration_hours\}\}/g, '72')
    .replace(/\{\{site_name\}\}/g, 'IPTV Boss')
    .replace(/\{\{site_url\}\}/g, 'http://localhost:3000')
    .replace(/\{\{code\}\}/g, 'ACTIVATION-CODE-123')
    .replace(/\{\{checkout_url\}\}/g, 'http://localhost:3001/checkout/abc')
    .replace(/\{\{amount\}\}/g, '14.99')
    .replace(/\{\{order_id\}\}/g, '42')
    .replace(/\{\{provider_name\}\}/g, 'StreamMax')
    .replace(/\{\{plan_name\}\}/g, 'Premium')
    .replace(/\{\{#if (\w+)\}\}[\s\S]*?\{\{\/if\}\}/g, '')

  const style = {
    container: { maxWidth: 900, margin: '0 auto' },
    header: { marginBottom: 32 },
    title: { fontSize: 24, fontWeight: 700, margin: '0 0 8px' },
    subtitle: { color: '#a0a0a0', fontSize: 14, margin: 0 },
    row: { display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' },
    label: { color: '#a0a0a0', fontSize: 12, display: 'block', marginBottom: 4 },
    input: {
      background: '#1a1a1a', border: '1px solid #333', borderRadius: 8,
      color: '#fff', padding: '10px 14px', fontSize: 14, width: '100%',
      outline: 'none', boxSizing: 'border-box',
    },
    select: {
      background: '#1a1a1a', border: '1px solid #333', borderRadius: 8,
      color: '#fff', padding: '10px 14px', fontSize: 14, minWidth: 180,
      outline: 'none',
    },
    textarea: {
      background: '#1a1a1a', border: '1px solid #333', borderRadius: 8,
      color: '#fff', padding: 12, fontSize: 13, fontFamily: 'monospace',
      width: '100%', minHeight: 300, outline: 'none', resize: 'vertical',
      boxSizing: 'border-box',
    },
    btn: (primary) => ({
      padding: '10px 24px', borderRadius: 8, border: 'none',
      fontWeight: 600, cursor: 'pointer', fontSize: 14,
      background: primary ? '#00d4ff' : '#333',
      color: primary ? '#000' : '#fff',
      opacity: saving ? 0.6 : 1,
    }),
    varTag: {
      display: 'inline-block', background: '#00d4ff20', color: '#00d4ff',
      padding: '4px 10px', borderRadius: 6, fontSize: 12, fontFamily: 'monospace',
      margin: '2px 4px 2px 0',
    },
    previewBox: {
      background: '#0f0f0f', border: '1px solid #333', borderRadius: 8,
      padding: 16, marginTop: 16, maxHeight: 400, overflow: 'auto',
      fontSize: 13, color: '#ccc', whiteSpace: 'pre-wrap',
    },
    tabBtn: (active) => ({
      padding: '8px 16px', borderRadius: 6, border: 'none',
      cursor: 'pointer', fontSize: 13, fontWeight: 500,
      background: active ? '#00d4ff' : '#2a2a2a',
      color: active ? '#000' : '#ccc',
    }),
  }

  return (
    <div style={style.container}>
      <div style={style.header}>
        <h2 style={style.title}>📧 Email Templates</h2>
        <p style={style.subtitle}>Customize emails sent to customers for trials and plan activations.</p>
      </div>

      <div style={style.row}>
        <div>
          <label style={style.label}>Template Type</label>
          <div style={{ display: 'flex', gap: 4 }}>
            <button style={style.tabBtn(templateType === 'trial')} onClick={() => setTemplateType('trial')}>Trial</button>
            <button style={style.tabBtn(templateType === 'credentials')} onClick={() => setTemplateType('credentials')}>Credentials</button>
            <button style={style.tabBtn(templateType === 'payment_link')} onClick={() => setTemplateType('payment_link')}>Payment Link</button>
          </div>
        </div>
        <div>
          <label style={style.label}>Scope</label>
          <div style={{ display: 'flex', gap: 4 }}>
            <button style={style.tabBtn(scope === 'default')} onClick={() => { setScope('default'); setSelectedPlanId('') }}>Default</button>
            <button style={style.tabBtn(scope === 'plan')} onClick={() => setScope('plan')}>Per Plan</button>
          </div>
        </div>
        {scope === 'plan' && (
          <div>
            <label style={style.label}>Select Plan</label>
            <select style={style.select} value={selectedPlanId} onChange={e => setSelectedPlanId(e.target.value)}>
              <option value="">-- Select a plan --</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>{p.provider_name} — {p.plan_name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {(!scope || scope === 'default' || selectedPlanId) && (
        <>
          <div style={{ marginBottom: 16 }}>
            <label style={style.label}>Email Subject</label>
            <input style={style.input} value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="Your {{duration_hours}}h {{site_name}} trial is ready!" />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={style.label}>Email Body (HTML) — <span style={{ color: '#666', fontSize: 12 }}>Use {"{{variable}}"} placeholders</span></label>
            <textarea style={style.textarea} value={bodyHtml} onChange={e => setBodyHtml(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24 }}>
            <button style={style.btn(true)} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Template'}
            </button>
            <button style={style.btn(false)} onClick={handleReset}>Reset to Default</button>
            {message && <span style={{ color: message.includes('failed') ? '#ff4444' : '#00cc66', fontSize: 13 }}>{message}</span>}
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={style.label}>Available Variables for {scopeLabel} {templateType} template</label>
            <div>
              {variables.length > 0 ? variables.map(v => (
                <span key={v} style={style.varTag}>{'{'}{'{'}{v}{'}'}{'}'}</span>
              )) : (
                <span style={{ color: '#666', fontSize: 13 }}>No variables listed for this template</span>
              )}
            </div>
          </div>

          <details style={{ marginBottom: 24 }}>
            <summary style={{ color: '#00d4ff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>📄 Preview</summary>
            <div style={style.previewBox} dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </details>
        </>
      )}

      {scope === 'plan' && !selectedPlanId && (
        <div style={{ color: '#666', textAlign: 'center', padding: 40, fontSize: 14 }}>
          Select a plan above to edit its {templateType} template.
          <br />If no custom template exists, the default template will be used.
        </div>
      )}
    </div>
  )
}