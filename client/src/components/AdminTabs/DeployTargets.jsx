import { useState, useEffect } from 'react'
import api from '../../api'

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #2a2a2a',
  background: '#0f0f0f', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box',
}
const btnStyle = {
  background: '#00d4ff', color: '#000', border: 'none', padding: '10px 20px',
  borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14,
}

export default function DeployTargets() {
  const [targets, setTargets] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ region_key: '', region_name: '', host: '', user: 'root', path: '/var/www/iptv-boss' })

  function load() { api.get('/admin/deploy-targets').then(r => setTargets(r.data)).catch(() => {}) }
  useEffect(load, [])

  function resetForm() { setForm({ region_key: '', region_name: '', host: '', user: 'root', path: '/var/www/iptv-boss' }); setEditId(null) }

  function openEdit(t) {
    setEditId(t.id)
    setForm({ region_key: t.region_key, region_name: t.region_name, host: t.host, user: t.user, path: t.path })
    setShowModal(true)
  }

  function handleSave() {
    if (editId) {
      api.put(`/admin/deploy-targets/${editId}`, form).then(() => { load(); setShowModal(false); resetForm() })
    } else {
      api.post('/admin/deploy-targets', form).then(() => { load(); setShowModal(false); resetForm() })
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this deploy target?')) return
    try {
      await api.delete(`/admin/deploy-targets/${id}`)
      load()
    } catch (e) {
      alert(e.response?.data?.error || 'Cannot delete')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <p style={{ color: '#666', margin: 0 }}>{targets.length} server(s) configured</p>
        <button onClick={() => { resetForm(); setShowModal(true) }} style={btnStyle}>
          + Add Server
        </button>
      </div>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill,minmax(380px,1fr))' }}>
        {targets.map(t => (
          <div key={t.id} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, color: '#00d4ff' }}>📍 {t.region_name}</h3>
                <p style={{ color: '#666', fontSize: 13, margin: '4px 0 0' }}>{t.region_key}</p>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => openEdit(t)} style={{ background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#00d4ff', fontSize: 12 }}>Edit</button>
                <button onClick={() => handleDelete(t.id)} style={{ background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#ff4444', fontSize: 12 }}>✕</button>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 6, fontSize: 13, color: '#a0a0a0' }}>
              <div><span style={{ color: '#666' }}>Host:</span> {t.host}</div>
              <div><span style={{ color: '#666' }}>User:</span> {t.user}</div>
              <div><span style={{ color: '#666' }}>Path:</span> {t.path}</div>
            </div>
          </div>
        ))}
      </div>

      {targets.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#666' }}>
          <p style={{ fontSize: 40, margin: '0 0 12px' }}>🗄️</p>
          <p>No servers configured yet. Add your first deploy target.</p>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 16, padding: 24, width: 460, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>{editId ? 'Edit Server' : 'Add Server'}</h2>
              <button onClick={() => { setShowModal(false); resetForm() }} style={{ background: 'transparent', border: 'none', color: '#a0a0a0', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input placeholder="Region Key (e.g. us, eu, asia)" value={form.region_key} onChange={e => setForm(f => ({ ...f, region_key: e.target.value }))} style={inputStyle} disabled={!!editId} />
              <input placeholder="Region Name (e.g. United States)" value={form.region_name} onChange={e => setForm(f => ({ ...f, region_name: e.target.value }))} style={inputStyle} />
              <input placeholder="Host (IP or domain)" value={form.host} onChange={e => setForm(f => ({ ...f, host: e.target.value }))} style={inputStyle} />
              <input placeholder="SSH User (default: root)" value={form.user} onChange={e => setForm(f => ({ ...f, user: e.target.value }))} style={inputStyle} />
              <input placeholder="Path (default: /var/www/iptv-boss)" value={form.path} onChange={e => setForm(f => ({ ...f, path: e.target.value }))} style={inputStyle} />
              <button onClick={handleSave} style={btnStyle}>{editId ? 'Update Server' : 'Add Server'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
