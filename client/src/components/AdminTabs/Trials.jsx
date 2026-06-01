import { useState, useEffect } from 'react'
import api from '../../api'

export default function Trials() {
  const [trials, setTrials] = useState([])
  const [stats, setStats] = useState(null)
  const [providers, setProviders] = useState([])
  const [filters, setFilters] = useState({ provider_id: '', status: '' })
  const [showImport, setShowImport] = useState(false)
  const [pasteInput, setPasteInput] = useState('')
  const [durationHours, setDurationHours] = useState(72)
  const [importResult, setImportResult] = useState(null)

  function load() {
    const params = new URLSearchParams()
    if (filters.provider_id) params.set('provider_id', filters.provider_id)
    if (filters.status) params.set('status', filters.status)
    api.get(`/admin/trials?${params}`).then(r => setTrials(r.data)).catch(() => {})
    api.get('/admin/trials/stats').then(r => setStats(r.data)).catch(() => {})
    api.get('/admin/providers').then(r => setProviders(r.data)).catch(() => {})
  }

  useEffect(load, [filters])

  function doImport() {
    if (!filters.provider_id) return alert('Select a provider first')
    api.post('/admin/trials/import', {
      provider_id: parseInt(filters.provider_id),
      codes: pasteInput,
      duration_hours: durationHours,
    }).then(r => {
      setImportResult(r.data)
      setPasteInput('')
      setTimeout(() => { setShowImport(false); setImportResult(null); load() }, 2000)
    }).catch(e => alert(e.response?.data?.error || 'Import failed'))
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filters.provider_id} onChange={e => setFilters(f => ({ ...f, provider_id: e.target.value }))} style={selectStyle}>
          <option value="">All Providers</option>
          {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} style={selectStyle}>
          <option value="">All Status</option>
          <option value="available">Available</option>
          <option value="used">Used</option>
          <option value="expired">Expired</option>
        </select>
        <button onClick={() => setShowImport(true)} style={btnPrimary}>+ Import Trials</button>
      </div>

      {stats && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          {Object.entries(stats).filter(([k]) => k !== 'total').map(([k, v]) => (
            <div key={k} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '12px 20px', textAlign: 'center' }}>
              <p style={{ color: '#666', fontSize: 12, margin: '0 0 4px', textTransform: 'capitalize' }}>{k}</p>
              <p style={{ color: k === 'available' ? '#00cc66' : k === 'used' ? '#ffaa00' : '#ff4444', fontSize: 22, fontWeight: 700, margin: 0 }}>{v}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #2a2a2a', color: '#666' }}>
              <th style={thStyle}>Provider</th>
              <th style={thStyle}>Username</th>
              <th style={thStyle}>Duration</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Expires</th>
            </tr>
          </thead>
          <tbody>
            {trials.map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                <td style={tdStyle}>{t.provider_name}</td>
                <td style={{ ...tdStyle, fontFamily: 'JetBrains Mono, monospace' }}>{t.username || t.code || '-'}</td>
                <td style={tdStyle}>{t.duration_hours}h</td>
                <td style={tdStyle}><span style={{ color: t.status === 'available' ? '#00cc66' : t.status === 'used' ? '#ffaa00' : '#ff4444', fontWeight: 600 }}>{t.status}</span></td>
                <td style={{ ...tdStyle, color: '#666' }}>{t.expires_at?.slice(0, 10) || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {trials.length === 0 && <p style={{ textAlign: 'center', color: '#666', padding: 40 }}>No trials found</p>}
      </div>

      {showImport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 16, padding: 24, width: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Import Trial Codes</h2>
              <button onClick={() => { setShowImport(false); setImportResult(null); setPasteInput('') }} style={{ background: 'transparent', border: 'none', color: '#a0a0a0', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <select value={durationHours} onChange={e => setDurationHours(parseInt(e.target.value))} style={selectStyle}>
                <option value={24}>24 hours</option>
                <option value={48}>48 hours</option>
                <option value={72}>72 hours</option>
              </select>
            </div>
            <textarea
              placeholder="Paste trial codes (one per line):&#10;username:password&#10;username:password:http://server.com"
              value={pasteInput} onChange={e => setPasteInput(e.target.value)} rows={6}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #2a2a2a', background: '#0f0f0f', color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'JetBrains Mono, monospace', boxSizing: 'border-box' }}
            />
            <button onClick={doImport} style={btnPrimary}>Import Trials</button>
            {importResult && (
              <div style={{ marginTop: 12, padding: 12, background: '#00cc6620', border: '1px solid #00cc66', borderRadius: 8, color: '#00cc66', textAlign: 'center' }}>
                ✅ {importResult.imported} trial codes imported!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const selectStyle = { padding: '8px 12px', borderRadius: 8, border: '1px solid #2a2a2a', background: '#0f0f0f', color: '#fff', fontSize: 13, outline: 'none' }
const btnPrimary = { padding: '8px 20px', background: '#00d4ff', color: '#000', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13, marginTop: 12 }
const thStyle = { textAlign: 'left', padding: '10px 14px', fontWeight: 500 }
const tdStyle = { padding: '10px 14px' }
