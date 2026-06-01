import { useState, useEffect } from 'react'
import api from '../../api'

export default function Pages() {
  const [pages, setPages] = useState([])
  const [showBuild, setShowBuild] = useState(false)
  const [form, setForm] = useState({ keyword: '', audience: '', provider_id: '', plan_id: '' })
  const [providers, setProviders] = useState([])
  const [building, setBuilding] = useState(false)

  function load() {
    api.get('/admin/pages').then(r => setPages(r.data)).catch(() => {})
    api.get('/admin/providers').then(r => setProviders(r.data)).catch(() => {})
  }

  useEffect(load, [])

  function buildPage() {
    if (!form.keyword) return alert('Keyword is required')
    setBuilding(true)
    api.post('/admin/pages/build', {
      keyword: form.keyword,
      audience: form.audience || undefined,
      provider_id: form.provider_id ? parseInt(form.provider_id) : undefined,
      plan_id: form.plan_id ? parseInt(form.plan_id) : undefined,
    }).then(r => {
      if (r.data.error) { alert(r.data.error); setBuilding(false); return }
      setShowBuild(false)
      setForm({ keyword: '', audience: '', provider_id: '', plan_id: '' })
      setBuilding(false)
      load()
    }).catch(e => { alert('Build failed'); setBuilding(false) })
  }

  function togglePage(id) {
    const p = pages.find(x => x.id === id)
    api.put(`/admin/pages/${id}`, { active: p.active ? 0 : 1 }).then(load)
  }

  function deletePage(id) {
    if (!confirm('Delete this page?')) return
    api.delete(`/admin/pages/${id}`).then(load)
  }

  const totalVisits = pages.reduce((s, p) => s + (p.visits || 0), 0)
  const totalConversions = pages.reduce((s, p) => s + (p.conversions || 0), 0)
  const bestPerformer = pages.length ? pages.reduce((best, p) => (p.visits || 0) > (best.visits || 0) ? p : best, pages[0]) : null

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {[
          ['Total Pages', pages.length],
          ['Visits', totalVisits],
          ['Conversions', totalConversions],
          ['Best Performer', bestPerformer ? bestPerformer.title : '-'],
        ].map(([l, v]) => (
          <div key={l} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '12px 20px', textAlign: 'center', flex: 1 }}>
            <p style={{ color: '#666', fontSize: 12, margin: '0 0 4px' }}>{l}</p>
            <p style={{ color: '#00d4ff', fontSize: 18, fontWeight: 700, margin: 0 }}>{v}</p>
          </div>
        ))}
      </div>

      <button onClick={() => setShowBuild(true)} style={{ marginBottom: 16, padding: '8px 20px', background: '#00d4ff', color: '#000', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
        + Build New Page
      </button>

      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #2a2a2a', color: '#666' }}>
              <th style={thStyle}>Title</th>
              <th style={thStyle}>Slug</th>
              <th style={thStyle}>Keyword</th>
              <th style={thStyle}>Visits</th>
              <th style={thStyle}>Conversions</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {pages.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                <td style={tdStyle}>{p.title}</td>
                <td style={{ ...tdStyle, color: '#666', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{p.slug}</td>
                <td style={tdStyle}>{p.keyword || '-'}</td>
                <td style={tdStyle}>{p.visits || 0}</td>
                <td style={tdStyle}>{p.conversions || 0}</td>
                <td style={tdStyle}>
                  <button onClick={() => togglePage(p.id)} style={{ background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: p.active ? '#00cc66' : '#ff4444', fontSize: 12 }}>
                    {p.active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td style={tdStyle}>
                  <button onClick={() => deletePage(p.id)} style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: 16 }}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pages.length === 0 && <p style={{ textAlign: 'center', color: '#666', padding: 40 }}>No pages yet. Build your first page!</p>}
      </div>

      {showBuild && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 16, padding: 24, width: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Build New Landing Page</h2>
              <button onClick={() => { if (!building) setShowBuild(false) }} style={{ background: 'transparent', border: 'none', color: '#a0a0a0', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input placeholder="Keyword (e.g., best iptv for sports)" value={form.keyword} onChange={e => setForm(f => ({ ...f, keyword: e.target.value }))} style={inputStyle} />
              <input placeholder="Target audience (e.g., sports fans)" value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))} style={inputStyle} />
              <select value={form.provider_id} onChange={e => setForm(f => ({ ...f, provider_id: e.target.value, plan_id: '' }))} style={inputStyle}>
                <option value="">Featured Provider (optional)</option>
                {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {building && (
                <div style={{ padding: 16, textAlign: 'center' }}>
                  <p style={{ color: '#00d4ff', margin: '0 0 8px' }}>🤖 AI is building your page...</p>
                  <div style={{ height: 4, background: '#2a2a2a', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: '60%', height: '100%', background: '#00d4ff', borderRadius: 2, animation: 'slide 1.5s ease-in-out infinite' }} />
                  </div>
                </div>
              )}
              <button onClick={buildPage} disabled={building} style={{
                padding: '10px', background: building ? '#2a2a2a' : '#00d4ff', color: building ? '#666' : '#000',
                border: 'none', borderRadius: 8, fontWeight: 600, cursor: building ? 'not-allowed' : 'pointer', fontSize: 14,
              }}>
                {building ? 'Building...' : 'Generate Page'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #2a2a2a', background: '#0f0f0f', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }
const thStyle = { textAlign: 'left', padding: '10px 14px', fontWeight: 500 }
const tdStyle = { padding: '10px 14px' }
