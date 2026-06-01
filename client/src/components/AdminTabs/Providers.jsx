import { useState, useEffect } from 'react'
import api from '../../api'

export default function Providers() {
  const [providers, setProviders] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [showPlanModal, setShowPlanModal] = useState(null)
  const [form, setForm] = useState({ name: '', specialty: '', website: '', panel_url: '', notes: '' })
  const [planForm, setPlanForm] = useState({ plan_name: '', plan_type: 'monthly', duration_days: 30, price_cost: 0, price_sell: 0, channels: 0, streams: 1, paypal_link: '' })

  function load() { api.get('/admin/providers').then(r => setProviders(r.data)).catch(() => {}) }
  useEffect(load, [])

  function addProvider() {
    api.post('/admin/providers', form).then(() => { load(); setShowModal(false); setForm({ name: '', specialty: '', website: '', panel_url: '', notes: '' }) }).catch(() => {})
  }

  function addPlan(providerId) {
    api.post(`/admin/providers/${providerId}/plans`, planForm).then(() => { load(); setShowPlanModal(null); setPlanForm({ plan_name: '', plan_type: 'monthly', duration_days: 30, price_cost: 0, price_sell: 0, channels: 0, streams: 1, paypal_link: '' }) }).catch(() => {})
  }

  function toggleProvider(id) {
    const p = providers.find(x => x.id === id)
    api.put(`/admin/providers/${id}`, { active: p.active ? 0 : 1 }).then(load)
  }

  function deleteProvider(id) {
    if (!confirm('Delete this provider?')) return
    api.delete(`/admin/providers/${id}`).then(load)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <p style={{ color: '#666', margin: 0 }}>{providers.length} providers</p>
        <button onClick={() => setShowModal(true)} style={{ background: '#00d4ff', color: '#000', border: 'none', padding: '8px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
          + Add Provider
        </button>
      </div>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))' }}>
        {providers.map(p => (
          <div key={p.id} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, color: '#00d4ff' }}>{p.name}</h3>
                <p style={{ color: '#666', fontSize: 13, margin: '4px 0 0' }}>{p.specialty || 'General'}</p>
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
            {p.website && <p style={{ color: '#a0a0a0', fontSize: 13, margin: '0 0 8px' }}>{p.website}</p>}
            <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#a0a0a0', marginBottom: 12 }}>
              <span>Codes: <strong style={{ color: '#00cc66' }}>{p.codes_available}</strong>/{p.codes_total}</span>
              <span>Trials: <strong style={{ color: '#ffaa00' }}>{p.trials_available}</strong></span>
              <span>Revenue: <strong style={{ color: '#00d4ff' }}>${(p.revenue || 0).toFixed(2)}</strong></span>
            </div>
            <button onClick={() => setShowPlanModal(p.id)} style={{ background: 'transparent', color: '#00d4ff', border: '1px solid #00d4ff', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13, width: '100%' }}>
              + Add Plan
            </button>
          </div>
        ))}
      </div>

      {showModal && (
        <Modal onClose={() => setShowModal(false)} title="Add Provider">
          <input placeholder="Provider Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
          <input placeholder="Specialty (e.g. Sports, Arabic)" value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} style={inputStyle} />
          <input placeholder="Website URL" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} style={inputStyle} />
          <input placeholder="Panel URL" value={form.panel_url} onChange={e => setForm(f => ({ ...f, panel_url: e.target.value }))} style={inputStyle} />
          <textarea placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ ...inputStyle, resize: 'vertical' }} />
          <button onClick={addProvider} style={btnStyle}>Save Provider</button>
        </Modal>
      )}

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
