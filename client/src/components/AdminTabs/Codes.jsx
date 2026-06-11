import { useState, useEffect, useRef } from 'react'
import api from '../../api'

export default function Codes() {
  const [codes, setCodes] = useState([])
  const [stats, setStats] = useState(null)
  const [filters, setFilters] = useState({ provider_id: '', plan_id: '', status: '', search: '' })
  const [providers, setProviders] = useState([])
  const [plans, setPlans] = useState([])
  const [showImport, setShowImport] = useState(false)
  const [importMethod, setImportMethod] = useState('paste')
  const [pasteInput, setPasteInput] = useState('')
  const [importResult, setImportResult] = useState(null)
  const [csvFile, setCsvFile] = useState(null)
  const [csvPreview, setCsvPreview] = useState([])
  const [manualForm, setManualForm] = useState({ code: '', username: '', password: '', server_url: '', mac_address: '', expires_at: '', notes: '' })
  const [importProviderId, setImportProviderId] = useState('')
  const [importPlanId, setImportPlanId] = useState('')
  const fileRef = useRef(null)

  function load() {
    const params = new URLSearchParams()
    if (filters.provider_id) params.set('provider_id', filters.provider_id)
    if (filters.plan_id) params.set('plan_id', filters.plan_id)
    if (filters.status) params.set('status', filters.status)
    if (filters.search) params.set('search', filters.search)
    api.get(`/admin/codes?${params}`).then(r => setCodes(r.data)).catch(() => {})
    api.get('/admin/codes/stats').then(r => setStats(r.data)).catch(() => {})
    api.get('/admin/providers').then(r => setProviders(r.data)).catch(() => {})
    api.get('/admin/plans').then(r => setPlans(r.data)).catch(() => {})
  }

  useEffect(load, [filters.provider_id, filters.status, filters.search])

  function doImport() {
    if (!importProviderId || !importPlanId) return alert('Select a provider and plan first')
    api.post('/admin/codes/import', { provider_id: parseInt(importProviderId), plan_id: parseInt(importPlanId), codes: pasteInput }).then(r => {
      setImportResult(r.data)
      setPasteInput('')
      setTimeout(() => { setShowImport(false); setImportResult(null); load() }, 2000)
    }).catch(e => alert(e.response?.data?.error || 'Import failed'))
  }

  function handleCsvFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setCsvFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      const lines = reader.result.split('\n').filter(Boolean)
      setCsvPreview(lines.slice(0, 5).map(l => ({ text: l, fields: l.split(',').map(f => f.trim()) })))
    }
    reader.readAsText(file)
  }

  function doCsvImport() {
    if (!importProviderId || !importPlanId || !csvFile) return alert('Select a provider, plan, and CSV file')
    const form = new FormData()
    form.append('file', csvFile)
    form.append('provider_id', importProviderId)
    form.append('plan_id', importPlanId)
    api.post('/admin/codes/import-csv', form).then(r => {
      setImportResult(r.data)
      setCsvFile(null)
      setCsvPreview([])
      setTimeout(() => { setShowImport(false); setImportResult(null); load() }, 2000)
    }).catch(e => alert(e.response?.data?.error || 'Import failed'))
  }

  function addManual() {
    if (!filters.provider_id || !filters.plan_id) return alert('Select a provider and plan first')
    const { code, username, password, server_url, mac_address, expires_at, notes } = manualForm
    api.post('/admin/codes/import', {
      provider_id: parseInt(filters.provider_id),
      plan_id: parseInt(filters.plan_id),
      codes: [code || username || ''].join('\n'),
      username, password, server_url, mac_address, expires_at, notes,
    }).then(r => {
      setImportResult(r.data)
      setManualForm({ code: '', username: '', password: '', server_url: '', mac_address: '', expires_at: '', notes: '' })
      setTimeout(() => { setShowImport(false); setImportResult(null); load() }, 2000)
    }).catch(e => alert(e.response?.data?.error || 'Import failed'))
  }

  function doExport() { window.open('/api/admin/codes/export', '_blank') }

  function deleteCode(id) {
    if (!confirm('Delete this code?')) return
    api.delete(`/admin/codes/${id}`).then(load)
  }

  const statusColors = { available: '#00cc66', used: '#ffaa00', expired: '#ff4444' }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filters.provider_id} onChange={e => setFilters(f => ({ ...f, provider_id: e.target.value, plan_id: '' }))} style={selectStyle}>
          <option value="">All Providers</option>
          {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filters.plan_id} onChange={e => setFilters(f => ({ ...f, plan_id: e.target.value }))} style={selectStyle}>
          <option value="">All Plans</option>
          {plans.filter(p => !filters.provider_id || String(p.provider_id) === filters.provider_id).map(p => <option key={p.id} value={p.id}>{p.plan_name}</option>)}
        </select>
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} style={selectStyle}>
          <option value="">All Status</option>
          <option value="available">Available</option>
          <option value="used">Used</option>
          <option value="expired">Expired</option>
        </select>
        <input placeholder="Search..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} style={{ ...inputStyle, maxWidth: 200 }} />
        <button onClick={() => setShowImport(true)} style={btnPrimary}>+ Import</button>
        <button onClick={doExport} style={{ ...btnPrimary, background: '#2a2a2a', color: '#fff' }}>Export CSV</button>
      </div>

      {stats && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          {Object.entries(stats).filter(([k]) => k !== 'total').map(([k, v]) => (
            <div key={k} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '12px 20px', textAlign: 'center' }}>
              <p style={{ color: '#666', fontSize: 12, margin: '0 0 4px', textTransform: 'capitalize' }}>{k}</p>
              <p style={{ color: statusColors[k] || '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>{v}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #2a2a2a', color: '#666' }}>
              <th style={thStyle}>Provider</th>
              <th style={thStyle}>Plan</th>
              <th style={thStyle}>Code</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Added</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {codes.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                <td style={tdStyle}>{c.provider_name}</td>
                <td style={tdStyle}>{c.plan_name}</td>
                <td style={{ ...tdStyle, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{c.code || c.username || '-'}</td>
                <td style={tdStyle}><span style={{ color: statusColors[c.status] || '#fff', fontWeight: 600 }}>{c.status}</span></td>
                <td style={{ ...tdStyle, color: '#666' }}>{c.added_at?.slice(0, 10)}</td>
                <td style={tdStyle}><button onClick={() => deleteCode(c.id)} style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: 16 }}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {codes.length === 0 && <p style={{ textAlign: 'center', color: '#666', padding: 40 }}>No codes found</p>}
      </div>

      {showImport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 16, padding: 24, width: 540, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Import Codes</h2>
              <button onClick={() => { setShowImport(false); setImportResult(null); setPasteInput(''); setCsvFile(null); setCsvPreview([]); setManualForm({ code: '', username: '', password: '', server_url: '', mac_address: '', expires_at: '', notes: '' }) }} style={{ background: 'transparent', border: 'none', color: '#a0a0a0', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>

            <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
              {[{ k: 'paste', l: 'Paste' }, { k: 'csv', l: 'CSV' }, { k: 'manual', l: 'Manual' }].map(({ k, l }) => (
                <button key={k} onClick={() => { setImportMethod(k); setImportResult(null) }}
                  style={{ flex: 1, padding: '8px', borderRadius: 6, border: '1px solid #2a2a2a', background: importMethod === k ? '#00d4ff' : 'transparent', color: importMethod === k ? '#000' : '#a0a0a0', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                  {l}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <select value={importProviderId} onChange={e => { setImportProviderId(e.target.value); setImportPlanId('') }} style={{ ...selectStyle, flex: 1 }}>
                <option value="">Select Provider</option>
                {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={importPlanId} onChange={e => setImportPlanId(e.target.value)} style={{ ...selectStyle, flex: 1 }}>
                <option value="">Select Plan</option>
                {plans.filter(p => !importProviderId || String(p.provider_id) === importProviderId).map(p => <option key={p.id} value={p.id}>{p.plan_name}</option>)}
              </select>
            </div>

            {importMethod === 'paste' && (
              <>
                <textarea
                  placeholder="Paste codes (one per line):&#10;code&#10;user:pass&#10;user:pass:http://server.com:MAC&#10;code,username,password,server,mac,expires,notes"
                  value={pasteInput} onChange={e => setPasteInput(e.target.value)}
                  rows={8}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, marginBottom: 12 }}
                />
                <button onClick={doImport} style={btnPrimary}>Import Codes</button>
              </>
            )}

            {importMethod === 'csv' && (
              <>
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handleCsvFile({ target: { files: e.dataTransfer.files } }) }}
                  style={{ border: '2px dashed #2a2a2a', borderRadius: 8, padding: 40, textAlign: 'center', cursor: 'pointer', marginBottom: 12 }}
                  onClick={() => fileRef.current?.click()}>
                  <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleCsvFile} style={{ display: 'none' }} />
                  {csvFile ? (
                    <p style={{ color: '#00d4ff', margin: 0 }}>{csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)</p>
                  ) : (
                    <>
                      <p style={{ color: '#a0a0a0', margin: '0 0 4px', fontSize: 24 }}>📁</p>
                      <p style={{ color: '#666', margin: 0, fontSize: 14 }}>Drop a CSV file here or click to browse</p>
                    </>
                  )}
                </div>
                {csvPreview.length > 0 && (
                  <div style={{ background: '#0f0f0f', borderRadius: 6, padding: 8, marginBottom: 12, fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#a0a0a0', maxHeight: 120, overflow: 'auto' }}>
                    <p style={{ margin: '0 0 4px', color: '#666' }}>Preview (first {csvPreview.length} rows):</p>
                    {csvPreview.map((row, i) => (
                      <div key={i} style={{ padding: '2px 0', borderBottom: '1px solid #1a1a1a' }}>
                        {row.fields.map((f, j) => <span key={j} style={{ color: j === 0 ? '#00d4ff' : '#a0a0a0', marginRight: 12 }}>{f}</span>)}
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={doCsvImport} disabled={!csvFile} style={{ ...btnPrimary, opacity: csvFile ? 1 : 0.5 }}>Upload & Import CSV</button>
              </>
            )}

            {importMethod === 'manual' && (
              <div style={{ display: 'grid', gap: 10 }}>
                {[
                  { k: 'code', l: 'Code', ph: 'Activation code' },
                  { k: 'username', l: 'Username', ph: 'Login username' },
                  { k: 'password', l: 'Password', ph: 'Login password' },
                  { k: 'server_url', l: 'Server URL', ph: 'http://server.com:port' },
                  { k: 'mac_address', l: 'MAC Address', ph: 'AA:BB:CC:DD:EE:FF' },
                  { k: 'expires_at', l: 'Expires At', ph: '2026-12-31' },
                  { k: 'notes', l: 'Notes', ph: 'Optional notes' },
                ].map(({ k, l, ph }) => (
                  <div key={k}>
                    <label style={{ color: '#a0a0a0', fontSize: 12, display: 'block', marginBottom: 4 }}>{l}</label>
                    <input value={manualForm[k]} onChange={e => setManualForm(f => ({ ...f, [k]: e.target.value }))} placeholder={ph} style={inputStyle} />
                  </div>
                ))}
                <button onClick={addManual} style={btnPrimary}>Add Code</button>
              </div>
            )}

            {importResult && (
              <div style={{ marginTop: 12, padding: 12, background: '#00cc6620', border: '1px solid #00cc66', borderRadius: 8, color: '#00cc66', textAlign: 'center' }}>
                ✅ {importResult.imported} code(s) imported successfully!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const selectStyle = {
  padding: '8px 12px', borderRadius: 8, border: '1px solid #2a2a2a',
  background: '#0f0f0f', color: '#fff', fontSize: 13, outline: 'none',
}
const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #2a2a2a',
  background: '#0f0f0f', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box',
}
const btnPrimary = {
  padding: '8px 20px', background: '#00d4ff', color: '#000', border: 'none',
  borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13,
}
const thStyle = { textAlign: 'left', padding: '10px 14px', fontWeight: 500 }
const tdStyle = { padding: '10px 14px' }
