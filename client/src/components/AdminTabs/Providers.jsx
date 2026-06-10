import { useState, useEffect } from 'react'
import api from '../../api'

export default function Providers() {
  const [providers, setProviders] = useState([])
  const [alerts, setAlerts] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [showPlanModal, setShowPlanModal] = useState(null)
  const [showM3uModal, setShowM3uModal] = useState(null)
  const [showCodesModal, setShowCodesModal] = useState(null)
  const [form, setForm] = useState({ name: '', specialty: '', website: '', panel_url: '', panel_username: '', panel_password: '', notes: '' })
  const [planForm, setPlanForm] = useState({ plan_name: '', plan_type: 'monthly', duration_days: 30, price_cost: 0, price_sell: 0, channels: 0, streams: 1, paypal_link: '' })
  const [m3uUrl, setM3uUrl] = useState('')
  const [m3uLoading, setM3uLoading] = useState(false)
  const [m3uResult, setM3uResult] = useState(null)
  const [codeInput, setCodeInput] = useState('')
  const [codeType, setCodeType] = useState('activation')
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeResult, setCodeResult] = useState(null)
  const [selectedProvider, setSelectedProvider] = useState(null)
  const [loading, setLoading] = useState(false)

  function load() {
    api.get('/panel-management/panels').then(r => {
      setProviders(r.data.panels || [])
      setAlerts(r.data.alerts || [])
    }).catch(() => {})
  }
  useEffect(load, [])

  function addProvider() {
    api.post('/panel-management/panels', form).then(() => {
      load()
      setShowModal(false)
      setForm({ name: '', specialty: '', website: '', panel_url: '', panel_username: '', panel_password: '', notes: '' })
    }).catch(() => {})
  }

  function addPlan(providerId) {
    api.post(`/admin/providers/${providerId}/plans`, planForm).then(() => {
      load()
      setShowPlanModal(null)
      setPlanForm({ plan_name: '', plan_type: 'monthly', duration_days: 30, price_cost: 0, price_sell: 0, channels: 0, streams: 1, paypal_link: '' })
    }).catch(() => {})
  }

  function toggleProvider(id) {
    const p = providers.find(x => x.id === id)
    api.post('/panel-management/panels', { ...p, active: !p.active }).then(load)
  }

  function deleteProvider(id) {
    if (!confirm('Delete this provider?')) return
    api.delete(`/panel-management/panels/${id}`).then(load)
  }

  function syncPanel(id) {
    setLoading(true)
    api.post(`/panel-management/panels/${id}/sync`).then(r => {
      alert(r.data.success ? `Sync complete: ${r.data.codes} codes` : `Sync failed: ${r.data.error}`)
      load()
    }).catch(() => {}).finally(() => setLoading(false))
  }

  function saveM3U() {
    if (!showM3uModal || !m3uUrl) return
    setM3uLoading(true)
    api.post('/panel-management/m3u', { providerId: showM3uModal, m3uUrl }).then(r => {
      setM3uResult(r.data)
      if (r.data.success) {
        setTimeout(() => { setShowM3uModal(null); setM3uUrl(''); setM3uResult(null) }, 2000)
      }
    }).catch(() => {}).finally(() => setM3uLoading(false))
  }

  function addCodes() {
    if (!showCodesModal || !codeInput) return
    setCodeLoading(true)
    const codes = codeInput.split('\n').filter(c => c.trim())
    if (codeType === 'activation') {
      api.post(`/panel-management/panels/${showCodesModal}/codes`, { planId: 1, codes }).then(r => {
        setCodeResult(r.data)
        if (r.data.added > 0) {
          setTimeout(() => { setShowCodesModal(null); setCodeInput(''); setCodeResult(null); load() }, 2000)
        }
      }).catch(() => {}).finally(() => setCodeLoading(false))
    } else {
      api.post(`/panel-management/panels/${showCodesModal}/trial-codes`, { codes }).then(r => {
        setCodeResult(r.data)
        if (r.data.added > 0) {
          setTimeout(() => { setShowCodesModal(null); setCodeInput(''); setCodeResult(null); load() }, 2000)
        }
      }).catch(() => {}).finally(() => setCodeLoading(false))
    }
  }

  return (
    <div>
      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {alerts.map((a, i) => (
            <div key={i} style={{ background: a.urgent ? '#ff444415' : '#ffd70015', border: `1px solid ${a.urgent ? '#ff4444' : '#ffd700'}`, borderRadius: 8, padding: 12, marginBottom: 8, color: '#fff', fontSize: 13 }}>
              ⚠️ <strong>{a.provider}</strong>: {a.type} stock low — {a.remaining} remaining
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <p style={{ color: '#666', margin: 0 }}>{providers.length} providers</p>
        <button onClick={() => setShowModal(true)} style={{ background: '#00d4ff', color: '#000', border: 'none', padding: '8px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
          + Add Provider
        </button>
      </div>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill,minmax(360px,1fr))' }}>
        {providers.map(p => (
          <div key={p.id} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, color: '#00d4ff' }}>{p.name}</h3>
                <p style={{ color: '#666', fontSize: 13, margin: '4px 0 0' }}>{p.specialty || 'General'}</p>
                {p.panel_url && <p style={{ color: '#555', fontSize: 11, margin: '2px 0 0' }}>{p.panel_url}</p>}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => toggleProvider(p.id)} style={{ background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: p.active ? '#00cc66' : '#ff4444', fontSize: 12 }}>
                  {p.active ? 'Active' : 'Inactive'}
                </button>
                <button onClick={() => deleteProvider(p.id)} style={{ background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#ff4444', fontSize: 12 }}>
                  ✕
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div style={{ background: '#0f0f0f', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#00d4ff' }}>{p.activationCodes?.available || 0}</div>
                <div style={{ fontSize: 11, color: '#888' }}>Activation Codes</div>
                <div style={{ fontSize: 10, color: '#555' }}>{p.activationCodes?.sold || 0} sold, {p.activationCodes?.today || 0} today</div>
              </div>
              <div style={{ background: '#0f0f0f', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#ffd700' }}>{p.trialCodes?.available || 0}</div>
                <div style={{ fontSize: 11, color: '#888' }}>Trial Codes</div>
                <div style={{ fontSize: 10, color: '#555' }}>{p.trialCodes?.sent || 0} sent, {p.trialCodes?.today || 0} today</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: '#00d4ff' }}>Revenue: ${(p.orders?.revenueToday || 0).toFixed(2)}</span>
              <span style={{ fontSize: 12, color: '#888' }}>Orders: {p.orders?.today || 0}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <button onClick={() => { setShowCodesModal(p.id); setSelectedProvider(p) }} style={{ background: '#00d4ff15', color: '#00d4ff', border: '1px solid #00d4ff', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                + Codes
              </button>
              <button onClick={() => { setShowM3uModal(p.id); setSelectedProvider(p) }} style={{ background: '#7b2dff15', color: '#7b2dff', border: '1px solid #7b2dff', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                M3U URL
              </button>
              <button onClick={() => syncPanel(p.id)} disabled={loading} style={{ background: '#00ff8815', color: '#00ff88', border: '1px solid #00ff88', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                🔄 Sync
              </button>
              <button onClick={() => setShowPlanModal(p.id)} style={{ background: 'transparent', color: '#00d4ff', border: '1px solid #00d4ff', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                + Plan
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Provider Modal */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)} title="Add Provider">
          <input placeholder="Provider Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
          <input placeholder="Specialty (e.g. Sports, Arabic)" value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} style={inputStyle} />
          <input placeholder="Website URL" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} style={inputStyle} />
          <input placeholder="Panel URL (e.g. https://panel.example.com)" value={form.panel_url} onChange={e => setForm(f => ({ ...f, panel_url: e.target.value }))} style={inputStyle} />
          <input placeholder="Panel Username" value={form.panel_username} onChange={e => setForm(f => ({ ...f, panel_username: e.target.value }))} style={inputStyle} />
          <input type="password" placeholder="Panel Password" value={form.panel_password} onChange={e => setForm(f => ({ ...f, panel_password: e.target.value }))} style={inputStyle} />
          <textarea placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ ...inputStyle, resize: 'vertical' }} />
          <button onClick={addProvider} style={btnStyle}>Save Provider</button>
        </Modal>
      )}

      {/* Add Plan Modal */}
      {showPlanModal && (
        <Modal onClose={() => setShowPlanModal(null)} title="Add Plan">
          <input placeholder="Plan Name" value={planForm.plan_name} onChange={e => setPlanForm(f => ({ ...f, plan_name: e.target.value }))} style={inputStyle} />
          <select value={planForm.plan_type} onChange={e => setPlanForm(f => ({ ...f, plan_type: e.target.value }))} style={inputStyle}>
            <option value="monthly">Monthly</option><option value="yearly">Yearly</option><option value="trial">Trial</option>
          </select>
          <input type="number" placeholder="Duration (days)" value={planForm.duration_days} onChange={e => setPlanForm(f => ({ ...f, duration_days: parseInt(e.target.value) || 0 }))} style={inputStyle} />
          <input type="number" placeholder="Cost Price" value={planForm.price_cost} onChange={e => setPlanForm(f => ({ ...f, price_cost: parseFloat(e.target.value) || 0 }))} style={inputStyle} />
          <input type="number" placeholder="Sell Price" value={planForm.price_sell} onChange={e => setPlanForm(f => ({ ...f, price_sell: parseFloat(e.target.value) || 0 }))} style={inputStyle} />
          <input type="number" placeholder="Channels" value={planForm.channels} onChange={e => setPlanForm(f => ({ ...f, channels: parseInt(e.target.value) || 0 }))} style={inputStyle} />
          <input type="number" placeholder="Streams" value={planForm.streams} onChange={e => setPlanForm(f => ({ ...f, streams: parseInt(e.target.value) || 1 }))} style={inputStyle} />
          <input placeholder="PayPal Link (e.g. https://paypal.me/...)" value={planForm.paypal_link} onChange={e => setPlanForm(f => ({ ...f, paypal_link: e.target.value }))} style={inputStyle} />
          <button onClick={() => addPlan(showPlanModal)} style={btnStyle}>Save Plan</button>
        </Modal>
      )}

      {/* M3U URL Modal */}
      {showM3uModal && (
        <Modal onClose={() => setShowM3uModal(null)} title={`M3U URL - ${selectedProvider?.name}`}>
          <p style={{ color: '#888', fontSize: 12, marginBottom: 12 }}>Enter a sample M3U URL. The system will parse it and auto-generate content (sports, movies, series) for the website.</p>
          <input placeholder="https://example.com/playlist.m3u" value={m3uUrl} onChange={e => setM3uUrl(e.target.value)} style={inputStyle} />
          {m3uResult && (
            <div style={{ background: '#0f0f0f', borderRadius: 8, padding: 12, fontSize: 12, color: '#00d4ff' }}>
              {m3uResult.success ? `✅ Parsed! Stats: ${JSON.stringify(m3uResult.parsed?.stats)}` : `❌ Failed: ${m3uResult.error}`}
            </div>
          )}
          <button onClick={saveM3U} disabled={m3uLoading} style={btnStyle}>{m3uLoading ? 'Parsing...' : 'Save M3U URL'}</button>
        </Modal>
      )}

      {/* Add Codes Modal */}
      {showCodesModal && (
        <Modal onClose={() => setShowCodesModal(null)} title={`Add Codes - ${selectedProvider?.name}`}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button onClick={() => setCodeType('activation')} style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid', cursor: 'pointer', background: codeType === 'activation' ? '#00d4ff' : '#1a1a1a', color: codeType === 'activation' ? '#000' : '#888', borderColor: codeType === 'activation' ? '#00d4ff' : '#2a2a2a', fontWeight: 600, fontSize: 12 }}>
              Activation Codes
            </button>
            <button onClick={() => setCodeType('trial')} style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid', cursor: 'pointer', background: codeType === 'trial' ? '#ffd700' : '#1a1a1a', color: codeType === 'trial' ? '#000' : '#888', borderColor: codeType === 'trial' ? '#ffd700' : '#2a2a2a', fontWeight: 600, fontSize: 12 }}>
              Trial Codes
            </button>
          </div>
          <p style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>Enter one code per line:</p>
          <textarea placeholder="ABC123&#10;DEF456&#10;GHI789" value={codeInput} onChange={e => setCodeInput(e.target.value)} style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }} />
          {codeResult && (
            <div style={{ background: '#0f0f0f', borderRadius: 8, padding: 12, fontSize: 12, color: '#00d4ff' }}>
              {codeResult.added ? `✅ ${codeResult.added} codes added` : `❌ Failed`}
            </div>
          )}
          <button onClick={addCodes} disabled={codeLoading} style={btnStyle}>{codeLoading ? 'Adding...' : `Add ${codeType === 'activation' ? 'Activation' : 'Trial'} Codes`}</button>
        </Modal>
      )}
    </div>
  )
}

function Modal({ onClose, title, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 16, padding: 24, width: 420, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#a0a0a0', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #2a2a2a',
  background: '#0f0f0f', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box',
}

const btnStyle = {
  width: '100%', padding: '10px', background: '#00d4ff', color: '#000', border: 'none',
  borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14, marginTop: 8,
}
