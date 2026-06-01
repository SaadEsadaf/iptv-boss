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
const selectStyle = { ...inputStyle, cursor: 'pointer' }

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
]

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function getSiteUrl(w, siteUrl) {
  let domains = []
  try { domains = JSON.parse(w.domains || '[]') } catch {}
  if (domains.length > 0) {
    const d = domains[0]
    return d.startsWith('http') ? d : `http://${d}`
  }
  return (siteUrl || 'http://localhost:3000') + '/_/website/' + w.slug
}

function getBaseUrl(w, siteUrl) {
  let domains = []
  try { domains = JSON.parse(w.domains || '[]') } catch {}
  if (domains.length > 0) {
    const d = domains[0]
    return d.startsWith('http') ? d : `http://${d}`
  }
  return siteUrl || 'http://localhost:3000'
}

function deployBadge(status) {
  if (!status) return null
  const map = {
    pending: { label: 'Pending', color: '#ffaa00', bg: '#ffaa0015', border: '#ffaa0033' },
    deployed: { label: 'Deployed', color: '#00cc66', bg: '#00cc6615', border: '#00cc6633' },
    error: { label: 'Error', color: '#ff4444', bg: '#ff444415', border: '#ff444433' },
  }
  const s = map[status] || { label: status, color: '#a0a0a0', bg: '#a0a0a015', border: '#a0a0a033' }
  return (
    <span style={{ background: s.bg, color: s.color, padding: '2px 10px', borderRadius: 4, border: `1px solid ${s.border}`, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
      {s.label}
    </span>
  )
}

export default function Websites({ onSelectWebsite }) {
  const [websites, setWebsites] = useState([])
  const [targets, setTargets] = useState([])
  const [siteUrl, setSiteUrl] = useState('http://localhost:3000')
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', site_name: '', logo_url: '', tagline: '', domains: '', language: 'en', deploy_region: '' })

  function load() {
    api.get('/admin/websites').then(r => setWebsites(r.data)).catch(() => {})
    api.get('/admin/deploy-targets').then(r => setTargets(r.data)).catch(() => {})
    api.get('/admin/settings').then(r => {
      if (r.data.site_url) setSiteUrl(r.data.site_url)
    }).catch(() => {})
  }
  useEffect(load, [])

  function resetForm() { setForm({ name: '', slug: '', site_name: '', logo_url: '', tagline: '', domains: '', language: 'en', deploy_region: '' }); setEditId(null) }

  function openEdit(w) {
    setEditId(w.id)
    setForm({
      name: w.name, slug: w.slug, site_name: w.site_name || '',
      logo_url: w.logo_url || '', tagline: w.tagline || '',
      domains: (() => { try { return JSON.parse(w.domains || '[]').join('\n') } catch { return '' } })(),
      language: w.language || 'en',
      deploy_region: w.deploy_region || '',
    })
    setShowModal(true)
  }

  function handleNameChange(name) {
    const slug = slugify(name)
    setForm(f => ({ ...f, name, slug: editId ? f.slug : slug }))
  }

  async function handleAiAssist() {
    if (!form.name) return alert('Enter a website name first')
    setAiLoading(true)
    try {
      const r = await api.post('/admin/websites/ai-assist', { name: form.name, language: form.language })
      setForm(f => ({
        ...f,
        site_name: r.data.site_name || f.site_name,
        tagline: r.data.tagline || f.tagline,
        logo_url: r.data.logo_suggestion ? `https://placehold.co/200x50?text=${encodeURIComponent(r.data.site_name || form.name)}` : f.logo_url,
      }))
    } catch (e) {
      alert('AI assist failed: ' + (e.response?.data?.error || e.message))
    }
    setAiLoading(false)
  }

  function handleSave() {
    const payload = {
      name: form.name,
      slug: form.slug,
      site_name: form.site_name,
      logo_url: form.logo_url,
      tagline: form.tagline,
      language: form.language,
      deploy_region: form.deploy_region,
      domains: form.domains.split('\n').map(d => d.trim()).filter(Boolean),
    }
    if (editId) {
      api.put(`/admin/websites/${editId}`, payload).then(() => { load(); setShowModal(false); resetForm() }).catch(e => alert(e.response?.data?.error || 'Save failed'))
    } else {
      api.post('/admin/websites', payload).then(() => { load(); setShowModal(false); resetForm() }).catch(e => alert(e.response?.data?.error || 'Create failed'))
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this website?')) return
    try {
      await api.delete(`/admin/websites/${id}`)
      load()
    } catch (e) {
      alert(e.response?.data?.error || 'Cannot delete')
    }
  }

  function toggleActive(w) {
    api.put(`/admin/websites/${w.id}`, { active: w.active ? 0 : 1 }).then(load).catch(e => alert(e.response?.data?.error || 'Failed'))
  }

  const langMap = Object.fromEntries(LANGUAGES.map(l => [l.code, l]))
  const regionMap = Object.fromEntries(targets.map(t => [t.region_key, t]))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <p style={{ color: '#666', margin: 0 }}>{websites.length} websites</p>
        <button onClick={() => { resetForm(); setShowModal(true) }} style={btnStyle}>
          + New Website
        </button>
      </div>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill,minmax(400px,1fr))' }}>
        {websites.map(w => {
          let domainList = []
          try { domainList = JSON.parse(w.domains || '[]') } catch {}
          const lang = langMap[w.language]
          const region = regionMap[w.deploy_region]
          const publicUrl = getSiteUrl(w, siteUrl)
          const baseUrl = getBaseUrl(w, siteUrl)
          const hasDomain = domainList.length > 0
          return (
            <div key={w.id} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ margin: 0, color: '#00d4ff', fontSize: 16 }}>{w.site_name || w.name}</h3>
                  <p style={{ color: hasDomain ? '#00cc66' : '#00d4ff', fontSize: 13, margin: '4px 0 0', wordBreak: 'break-all' }}>
                    {publicUrl}
                  </p>
                  <p style={{ color: '#555', fontSize: 11, margin: '2px 0 0' }}>
                    {hasDomain ? baseUrl : 'Preview page — no custom domain set'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button onClick={() => toggleActive(w)} style={{ background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: w.active ? '#00cc66' : '#ff4444', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {w.active ? 'Active' : 'Inactive'}
                  </button>
                  {w.id !== 1 && (
                    <button onClick={() => handleDelete(w.id)} style={{ background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#ff4444', fontSize: 12 }}>
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {w.tagline && (
                <p style={{ color: '#a0a0a0', fontSize: 13, margin: '0 0 10px', fontStyle: 'italic' }}>"{w.tagline}"</p>
              )}

              {domainList.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ color: '#a0a0a0', fontSize: 12, margin: '0 0 4px' }}>Domains:</p>
                  {domainList.map((d, i) => (
                    <span key={i} style={{ display: 'inline-block', background: '#0f0f0f', color: '#00cc66', padding: '2px 8px', borderRadius: 4, fontSize: 12, margin: '2px 4px 2px 0' }}>{d}</span>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, fontSize: 12, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                {lang && (
                  <span style={{ background: '#00d4ff15', color: '#00d4ff', padding: '2px 10px', borderRadius: 4, border: '1px solid #00d4ff33', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {lang.flag} {lang.label}
                  </span>
                )}
                {region ? (
                  <span style={{ background: '#00ff8815', color: '#00ff88', padding: '2px 10px', borderRadius: 4, border: '1px solid #00ff8833', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    📍 {region.region_name}
                  </span>
                ) : w.deploy_region ? (
                  <span style={{ background: '#ffaa0015', color: '#ffaa00', padding: '2px 10px', borderRadius: 4, border: '1px solid #ffaa0033', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    📍 {w.deploy_region}
                  </span>
                ) : null}
                {deployBadge(w.deploy_status)}
                {w.deployed_at && (
                  <span style={{ color: '#666', padding: '2px 4px', fontSize: 11 }}>
                    Deployed {new Date(w.deployed_at).toLocaleDateString()}
                  </span>
                )}
                <span style={{ color: '#666', padding: '2px 4px' }}>ID: {w.id}</span>
                {w.page_count > 0 && (
                  <span style={{ background: '#00d4ff10', color: '#00d4ff', padding: '2px 8px', borderRadius: 4, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    📄 {w.page_count}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <a href={publicUrl} target="_blank" rel="noopener noreferrer" style={{
                  flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: '#00d4ff', color: '#000', border: 'none', borderRadius: 6, padding: '6px 14px',
                  cursor: 'pointer', fontSize: 13, textDecoration: 'none', fontWeight: 600,
                }}>
                  🌐 Visit Site
                </a>
                <button onClick={() => openEdit(w)} style={{
                  flex: 1, background: 'transparent', color: '#00d4ff', border: '1px solid #00d4ff',
                  borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13,
                }}>
                  ✏️ Edit
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 16, padding: 24, width: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>{editId ? 'Edit Website' : 'New Website'}</h2>
              <button onClick={() => { setShowModal(false); resetForm() }} style={{ background: 'transparent', border: 'none', color: '#a0a0a0', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input placeholder="Website Name" value={form.name} onChange={e => handleNameChange(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                {!editId && (
                  <button onClick={handleAiAssist} disabled={aiLoading} style={{
                    background: aiLoading ? '#555' : '#a855f7', color: '#fff', border: 'none',
                    padding: '10px 16px', borderRadius: 8, fontWeight: 600, cursor: aiLoading ? 'wait' : 'pointer',
                    fontSize: 13, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    {aiLoading ? '⏳' : '🤖 AI Assist'}
                  </button>
                )}
              </div>
              <input placeholder="Slug (e.g. my-store)" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))} style={inputStyle} disabled={!!editId} />
              <input placeholder="Site Name (display name)" value={form.site_name} onChange={e => setForm(f => ({ ...f, site_name: e.target.value }))} style={inputStyle} />
              <input placeholder="Tagline (one-line description)" value={form.tagline} onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))} style={inputStyle} />
              <input placeholder="Logo URL" value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} style={inputStyle} />

              <div>
                <label style={{ color: '#a0a0a0', fontSize: 12, marginBottom: 4, display: 'block' }}>Store Language</label>
                <select value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))} style={selectStyle}>
                  {LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ color: '#a0a0a0', fontSize: 12, marginBottom: 4, display: 'block' }}>Deploy Region</label>
                <select value={form.deploy_region} onChange={e => setForm(f => ({ ...f, deploy_region: e.target.value }))} style={selectStyle}>
                  <option value="">— Not assigned —</option>
                  {targets.map(t => (
                    <option key={t.id} value={t.region_key}>📍 {t.region_name}</option>
                  ))}
                </select>
                {form.deploy_region && (
                  <p style={{ color: '#ffaa00', fontSize: 12, margin: '4px 0 0' }}>Site will be marked as pending deploy</p>
                )}
              </div>

              <div>
                <label style={{ color: '#a0a0a0', fontSize: 12, marginBottom: 4, display: 'block' }}>Domains (one per line)</label>
                <textarea placeholder="domain1.com&#10;domain2.com" value={form.domains} onChange={e => setForm(f => ({ ...f, domains: e.target.value }))} style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} />
              </div>

              {form.slug && (
                <p style={{ color: '#666', fontSize: 12, margin: 0 }}>
                  Public URL: {siteUrl || 'http://localhost:3000'}/{form.slug}
                </p>
              )}

              <button onClick={handleSave} style={btnStyle}>{editId ? 'Update Website' : 'Create Website'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
