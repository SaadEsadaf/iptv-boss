import { useState, useEffect } from 'react'
import api from '../../api'

const SOURCE_ICONS = {
  telegram: '📱', youtube: '🎥', twitter: '🐦', reddit: '🤖',
}

const STATUS_COLORS = {
  new: '#00d4ff', ad_created: '#00cc66', page_built: '#ffaa00',
  contacted: '#8b5cf6', dismissed: '#666',
}

const SUB_TABS = ['Audit', 'Rankings', 'Leads', 'Analytics', 'Sources', 'Settings']

function formatTime(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return d.toLocaleDateString()
}

export default function SEO() {
  const [subTab, setSubTab] = useState('Audit')

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#1a1a1a', borderRadius: 10, padding: 4, border: '1px solid #2a2a2a' }}>
        {SUB_TABS.map(t => (
          <button key={t} onClick={() => setSubTab(t)} style={{
            flex: 1, padding: '8px 16px', background: subTab === t ? '#2a2a2a' : 'transparent',
            color: subTab === t ? '#00d4ff' : '#666', border: 'none', borderRadius: 8,
            fontWeight: subTab === t ? 600 : 400, cursor: 'pointer', fontSize: 13, transition: '0.15s',
          }}>
            {t === 'Audit' && '🔍 '}{t === 'Rankings' && '📈 '}{t === 'Leads' && '📡 '}{t === 'Analytics' && '📊 '}{t === 'Sources' && '🌐 '}{t === 'Settings' && '⚙️ '}{t}
          </button>
        ))}
      </div>
      {subTab === 'Audit' && <AuditSubTab />}
      {subTab === 'Rankings' && <RankingsSubTab />}
      {subTab === 'Leads' && <LeadsSubTab />}
      {subTab === 'Analytics' && <AnalyticsSubTab />}
      {subTab === 'Sources' && <SourcesSubTab />}
      {subTab === 'Settings' && <SettingsSubTab />}
    </div>
  )
}

/* ========== AUDIT (existing SEO functionality) ========== */
function AuditSubTab() {
  const [suggestions, setSuggestions] = useState([])
  const [log, setLog] = useState([])
  const [running, setRunning] = useState(false)

  function load() {
    api.get('/admin/seo/suggestions').then(r => setSuggestions(r.data)).catch(() => {})
    api.get('/admin/seo/log').then(r => setLog(r.data.slice(0, 20))).catch(() => {})
  }

  useEffect(load, [])

  function runAudit() {
    setRunning(true)
    api.post('/admin/seo/run').then(() => { load(); setRunning(false) }).catch(() => setRunning(false))
  }

  function buildSuggestion(id) {
    api.post(`/admin/seo/build-suggestion/${id}`).then(r => {
      if (r.data.slug) { alert(`Page built: /lp/${r.data.slug}`); load() }
      else alert(r.data.error || 'Build failed')
    }).catch(() => alert('Build failed'))
  }

  const lastRun = log.find(l => l.run_type === 'suggestion' || l.action === 'audit_completed')

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <p style={{ margin: 0, color: '#a0a0a0', fontSize: 13 }}>Last run: {lastRun?.created_at || 'Never'}</p>
        <button onClick={runAudit} disabled={running} style={{
          padding: '8px 20px', background: running ? '#2a2a2a' : '#00d4ff',
          color: running ? '#666' : '#000', border: 'none', borderRadius: 8,
          fontWeight: 600, cursor: running ? 'not-allowed' : 'pointer', fontSize: 13,
        }}>{running ? 'Running...' : 'Run SEO Audit'}</button>
      </div>

      <h3 style={{ fontSize: 16, margin: '0 0 12px' }}>Suggestions</h3>
      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ borderBottom: '1px solid #2a2a2a', color: '#666' }}>
            <th style={thStyle}>Keyword</th><th style={thStyle}>Audience</th><th style={thStyle}>Status</th><th style={thStyle}>Actions</th>
          </tr></thead>
          <tbody>
            {suggestions.map(s => {
              let details = {}
              try { details = JSON.parse(s.details || '{}') } catch {}
              return (
                <tr key={s.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                  <td style={tdStyle}>{s.keyword}</td>
                  <td style={{ ...tdStyle, color: '#a0a0a0' }}>{details.audience || '-'}</td>
                  <td style={tdStyle}>
                    <span style={{ color: s.status === 'completed' ? '#00cc66' : s.status === 'pending' ? '#ffaa00' : '#666', fontWeight: 600 }}>{s.status}</span>
                  </td>
                  <td style={tdStyle}>
                    {s.status === 'pending' && (
                      <button onClick={() => buildSuggestion(s.id)} style={{ background: '#00d4ff', color: '#000', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Build Page</button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {suggestions.length === 0 && <p style={{ textAlign: 'center', color: '#666', padding: 20 }}>No suggestions yet. Run an SEO audit.</p>}
      </div>

      <h3 style={{ fontSize: 16, margin: '0 0 12px' }}>Activity Log</h3>
      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 16, maxHeight: 300, overflowY: 'auto' }}>
        {log.map(l => (
          <div key={l.id} style={{ padding: '6px 0', borderBottom: '1px solid #2a2a2a', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
            <span><span style={{ color: '#00d4ff' }}>{l.run_type || l.action}</span> — {l.keyword || l.details?.slice(0, 60)}</span>
            <span style={{ color: '#666', whiteSpace: 'nowrap', marginLeft: 12, fontSize: 12 }}>{l.created_at?.slice(0, 16)}</span>
          </div>
        ))}
        {log.length === 0 && <p style={{ color: '#666', textAlign: 'center' }}>No activity yet</p>}
      </div>
    </div>
  )
}

/* ========== RANKINGS (SERP position tracking) ========== */
function RankingsSubTab() {
  const [ranks, setRanks] = useState([])
  const [pages, setPages] = useState([])
  const [form, setForm] = useState({ keyword: '', page_id: '', target_url: '', locale: 'us' })
  const [checking, setChecking] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editPos, setEditPos] = useState('')

  function load() {
    api.get('/admin/seo/ranks').then(r => setRanks(r.data)).catch(() => {})
    api.get('/admin/pages').then(r => setPages(r.data)).catch(() => {})
  }

  useEffect(load, [])

  function addKeyword() {
    if (!form.keyword.trim()) return
    api.post('/admin/seo/ranks', {
      keyword: form.keyword.trim(),
      page_id: form.page_id ? Number(form.page_id) : null,
      target_url: form.target_url.trim() || null,
      locale: form.locale,
    }).then(() => { setForm({ keyword: '', page_id: '', target_url: '', locale: 'us' }); load() })
      .catch(e => alert(e.response?.data?.error || 'Add failed'))
  }

  function removeTrack(id) {
    if (!confirm('Remove this keyword from tracking?')) return
    api.delete(`/admin/seo/ranks/${id}`).then(load).catch(() => {})
  }

  function checkAll() {
    setChecking(true)
    api.post('/admin/seo/ranks/check-all').then(r => {
      const failed = r.data.results.filter(x => x.error).length
      if (failed > 0) alert(`${r.data.results.length - failed} checked, ${failed} errors`)
      load()
    }).catch(e => alert(e.response?.data?.error || 'Check failed'))
      .finally(() => setChecking(false))
  }

  function checkOne(id) {
    api.post(`/admin/seo/ranks/${id}/check`).then(load).catch(() => {})
  }

  function saveManualPos(id) {
    const pos = Number(editPos)
    if (isNaN(pos) || pos < 1) return alert('Position must be a positive number')
    api.put(`/admin/seo/ranks/${id}`, { position: pos }).then(() => {
      setEditingId(null); setEditPos(''); load()
    }).catch(() => {})
  }

  function updateLoc(id, locale) {
    api.put(`/admin/seo/ranks/${id}`, { locale }).then(load).catch(() => {})
  }

  function trendIcon(trend) {
    if (trend === 'up') return <span style={{ color: '#00cc66' }}>▲</span>
    if (trend === 'down') return <span style={{ color: '#ff4444' }}>▼</span>
    if (trend === 'stable') return <span style={{ color: '#888' }}>―</span>
    if (trend === 'not_found') return <span style={{ color: '#ffaa00' }}>✕</span>
    return <span style={{ color: '#888' }}>●</span>
  }

  const hasSerpKey = ranks.length > 0 || true // we let user add keywords anyway

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <label style={{ color: '#666', fontSize: 11, display: 'block', marginBottom: 2 }}>Keyword</label>
          <input value={form.keyword} onChange={e => setForm(f => ({ ...f, keyword: e.target.value }))}
            placeholder="best iptv sports 2026"
            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #2a2a2a', background: '#0f0f0f', color: '#fff', fontSize: 13, boxSizing: 'border-box' }}
            onKeyDown={e => e.key === 'Enter' && addKeyword()} />
        </div>
        <div style={{ minWidth: 140 }}>
          <label style={{ color: '#666', fontSize: 11, display: 'block', marginBottom: 2 }}>Landing Page</label>
          <select value={form.page_id} onChange={e => setForm(f => ({ ...f, page_id: e.target.value }))}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #2a2a2a', background: '#0f0f0f', color: '#fff', fontSize: 13 }}>
            <option value="">— None —</option>
            {pages.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
        <div style={{ minWidth: 120 }}>
          <label style={{ color: '#666', fontSize: 11, display: 'block', marginBottom: 2 }}>Locale</label>
          <select value={form.locale} onChange={e => setForm(f => ({ ...f, locale: e.target.value }))}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #2a2a2a', background: '#0f0f0f', color: '#fff', fontSize: 13 }}>
            <option value="us">🇺🇸 US</option>
            <option value="uk">🇬🇧 UK</option>
            <option value="de">🇩🇪 Germany</option>
            <option value="fr">🇫🇷 France</option>
            <option value="es">🇪🇸 Spain</option>
            <option value="it">🇮🇹 Italy</option>
            <option value="nl">🇳🇱 Netherlands</option>
            <option value="br">🇧🇷 Brazil</option>
            <option value="in">🇮🇳 India</option>
            <option value="ae">🇦🇪 UAE</option>
          </select>
        </div>
        <button onClick={addKeyword} style={{
          padding: '8px 16px', background: '#00d4ff', color: '#000', border: 'none', borderRadius: 6,
          fontWeight: 600, cursor: 'pointer', fontSize: 13, height: 36,
        }}>+ Track</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <button onClick={checkAll} disabled={checking} style={{
          padding: '8px 16px', background: checking ? '#2a2a2a' : '#ffaa00', color: checking ? '#666' : '#000',
          border: 'none', borderRadius: 6, fontWeight: 600, cursor: checking ? 'not-allowed' : 'pointer', fontSize: 13,
        }}>{checking ? '⏳ Checking...' : '🔍 Check All Rankings'}</button>
        <span style={{ color: '#666', fontSize: 12 }}>Uses SerpAPI (configured in Settings)</span>
      </div>

      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ borderBottom: '1px solid #2a2a2a', color: '#666' }}>
            <th style={thStyle}>Keyword</th>
            <th style={thStyle}>Page</th>
            <th style={thStyle}>Position</th>
            <th style={thStyle}>Trend</th>
            <th style={thStyle}>Locale</th>
            <th style={thStyle}>Last Checked</th>
            <th style={thStyle}>Actions</th>
          </tr></thead>
          <tbody>
            {ranks.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#666' }}>
                No keywords tracked yet. Add one above.
              </td></tr>
            )}
            {ranks.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 500 }}>{r.keyword}</div>
                  {r.target_url && <div style={{ color: '#00d4ff', fontSize: 11 }}>{r.target_url}</div>}
                </td>
                <td style={tdStyle}>
                  {r.page_title
                    ? <a href={`/lp/${r.page_slug}`} target="_blank" rel="noreferrer"
                        style={{ color: '#00d4ff', textDecoration: 'none' }}>{r.page_title}</a>
                    : <span style={{ color: '#666' }}>—</span>}
                </td>
                <td style={tdStyle}>
                  {editingId === r.id ? (
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <input type="number" min="1" value={editPos}
                        onChange={e => setEditPos(e.target.value)}
                        style={{ width: 50, padding: '4px 6px', borderRadius: 4, border: '1px solid #2a2a2a', background: '#0f0f0f', color: '#fff', fontSize: 13, textAlign: 'center' }} />
                      <button onClick={() => saveManualPos(r.id)} style={{ background: '#00cc66', color: '#000', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Save</button>
                      <button onClick={() => { setEditingId(null); setEditPos('') }} style={{ background: '#444', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}>✕</button>
                    </div>
                  ) : (
                    <span style={{
                      fontWeight: 700, fontSize: 16,
                      color: r.position === null ? '#ffaa00' : r.position <= 3 ? '#00cc66' : r.position <= 10 ? '#00d4ff' : '#ff4444',
                    }}>
                      {r.position === null ? '—' : `#${r.position}`}
                    </span>
                  )}
                </td>
                <td style={tdStyle}>{trendIcon(r.trend)}</td>
                <td style={tdStyle}>
                  <select value={r.locale || 'us'} onChange={e => updateLoc(r.id, e.target.value)}
                    style={{ background: 'transparent', color: '#a0a0a0', border: '1px solid #2a2a2a', borderRadius: 4, padding: '2px 6px', fontSize: 12, cursor: 'pointer' }}>
                    <option value="us">🇺🇸 US</option>
                    <option value="uk">🇬🇧 UK</option>
                    <option value="de">🇩🇪 DE</option>
                    <option value="fr">🇫🇷 FR</option>
                    <option value="es">🇪🇸 ES</option>
                    <option value="it">🇮🇹 IT</option>
                    <option value="nl">🇳🇱 NL</option>
                    <option value="br">🇧🇷 BR</option>
                    <option value="in">🇮🇳 IN</option>
                    <option value="ae">🇦🇪 AE</option>
                  </select>
                </td>
                <td style={{ ...tdStyle, color: '#666', fontSize: 12 }}>
                  {r.checked_at ? formatTime(r.checked_at) : 'Never'}
                </td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => checkOne(r.id)} title="Check now"
                      style={{ background: '#2a2a2a', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}>🔍</button>
                    <button onClick={() => { setEditingId(r.id); setEditPos(String(r.position || '')) }} title="Set position manually"
                      style={{ background: '#2a2a2a', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}>✏️</button>
                    <button onClick={() => removeTrack(r.id)} title="Remove"
                      style={{ background: '#2a2a2a', color: '#ff4444', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ========== LEADS (migrated from DemandSignals + enriched) ========== */
function LeadsSubTab() {
  const [signals, setSignals] = useState([])
  const [stats, setStats] = useState(null)
  const [sniffing, setSniffing] = useState({})
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [sourceFilter, setSourceFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [langFilter, setLangFilter] = useState('')
  const [hasEmailFilter, setHasEmailFilter] = useState('')
  const [hasPhoneFilter, setHasPhoneFilter] = useState('')

  function loadSignals() {
    const params = { page, limit: 50 }
    if (sourceFilter) params.source = sourceFilter
    if (statusFilter) params.status = statusFilter
    if (langFilter) params.language = langFilter
    if (hasEmailFilter) params.hasEmail = hasEmailFilter
    if (hasPhoneFilter) params.hasPhone = hasPhoneFilter
    api.get('/demand/signals', { params }).then(r => {
      setSignals(r.data.signals)
      setTotal(r.data.total)
    }).catch(() => {})
  }

  function loadStats() {
    api.get('/demand/signals/stats').then(r => setStats(r.data)).catch(() => {})
  }

  useEffect(() => { loadSignals() }, [page, sourceFilter, statusFilter, langFilter, hasEmailFilter, hasPhoneFilter])
  useEffect(() => { loadStats() }, [])

  function sniffSource(source) {
    setSniffing(s => ({ ...s, [source]: true }))
    const endpoint = source === 'all' ? '/demand/signals/sniff-all' : '/demand/signals/sniff'
    api.post(endpoint).then(r => {
      loadSignals(); loadStats()
      if (source === 'all') {
        const counts = Object.values(r.data).filter(v => v && v.saved).map(v => v.saved)
        const total = counts.reduce((a, b) => a + b, 0)
        alert(total > 0 ? `Sniffed all sources, saved ${total} new signals` : 'No new signals found')
      } else {
        alert(r.data.saved > 0 ? `Found ${r.data.total} relevant, saved ${r.data.saved} new` : 'No new signals found')
      }
    }).catch(() => alert('Sniff failed')).finally(() => setSniffing(s => ({ ...s, [source]: false })))
  }

  function updateStatus(id, status) {
    api.put(`/demand/signals/${id}/status`, { status }).then(() => { loadSignals(); loadStats() }).catch(() => {})
  }

  function enrichSignal(id) {
    api.put(`/demand/signals/${id}/enrich`).then(() => { loadSignals(); loadStats() }).catch(() => alert('Enrich failed'))
  }

  const totalPages = Math.ceil(total / 50)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: '#00d4ff' }}>📡 Lead Signals</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'telegram', label: '📱 Telegram' },
            { id: 'reddit', label: '🤖 Reddit' },
            { id: 'youtube', label: '🎥 YouTube' },
            { id: 'twitter', label: '🐦 X/Twitter' },
          ].map(src => (
            <button key={src.id} onClick={() => sniffSource(src.id)} disabled={sniffing[src.id]} style={{
              padding: '8px 14px', background: sniffing[src.id] ? '#2a2a2a' : '#2a2a2a',
              color: sniffing[src.id] ? '#666' : '#fff', border: '1px solid #2a2a2a', borderRadius: 8,
              fontWeight: 500, cursor: sniffing[src.id] ? 'default' : 'pointer', fontSize: 12,
            }}>{sniffing[src.id] ? '⏳...' : src.label}</button>
          ))}
          <button onClick={() => sniffSource('all')} disabled={sniffing.all} style={{
            padding: '8px 20px', background: sniffing.all ? '#2a2a2a' : '#00d4ff',
            color: sniffing.all ? '#666' : '#000', border: 'none', borderRadius: 8,
            fontWeight: 600, cursor: sniffing.all ? 'default' : 'pointer', fontSize: 13,
          }}>{sniffing.all ? '⏳ Sniffing...' : '🔄 Sniff All'}</button>
        </div>
      </div>

      {stats && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          <div style={statCardStyle}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#00d4ff' }}>{stats.total}</div>
            <div style={{ fontSize: 12, color: '#666' }}>Total</div>
          </div>
          {stats.bySource?.map(s => (
            <div key={s.source} style={statCardStyle}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{s.count}</div>
              <div style={{ fontSize: 12, color: '#666' }}>{SOURCE_ICONS[s.source] || '📡'} {s.source}</div>
            </div>
          ))}
          <div style={statCardStyle}>
            <div style={{ fontSize: 24, fontWeight: 700, color: stats.contactInfo?.withEmail > 0 ? '#00cc66' : '#666' }}>{stats.contactInfo?.withEmail || 0}</div>
            <div style={{ fontSize: 12, color: '#666' }}>✉️ Emails</div>
          </div>
          <div style={statCardStyle}>
            <div style={{ fontSize: 24, fontWeight: 700, color: stats.contactInfo?.withPhone > 0 ? '#00cc66' : '#666' }}>{stats.contactInfo?.withPhone || 0}</div>
            <div style={{ fontSize: 12, color: '#666' }}>📞 Phones</div>
          </div>
          <div style={statCardStyle}>
            <div style={{ fontSize: 24, fontWeight: 700, color: stats.contactInfo?.withGroups > 0 ? '#00cc66' : '#666' }}>{stats.contactInfo?.withGroups || 0}</div>
            <div style={{ fontSize: 12, color: '#666' }}>🔗 Groups</div>
          </div>
          <div style={statCardStyle}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{stats.lastSniff ? formatTime(stats.lastSniff) : 'Never'}</div>
            <div style={{ fontSize: 12, color: '#666' }}>Last Sniff</div>
          </div>
        </div>
      )}

      {stats?.byIntentRange && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {stats.byIntentRange.map(r => (
            <div key={r.range} style={{
              background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 14px',
              flex: 1, minWidth: 80, textAlign: 'center',
            }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: parseInt(r.range) >= 76 ? '#00cc66' : parseInt(r.range) >= 51 ? '#ffaa00' : '#666' }}>{r.count}</div>
              <div style={{ fontSize: 11, color: '#666' }}>Score {r.range}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={sourceFilter} onChange={e => { setSourceFilter(e.target.value); setPage(1) }} style={filterStyle}>
          <option value="">All Sources</option>
          <option value="telegram">📱 Telegram</option>
          <option value="youtube">🎥 YouTube</option>
          <option value="twitter">🐦 Twitter</option>
          <option value="reddit">🤖 Reddit</option>
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} style={filterStyle}>
          <option value="">All Status</option>
          <option value="new">🆕 New</option>
          <option value="ad_created">✏️ Ad Created</option>
          <option value="page_built">📄 Page Built</option>
          <option value="contacted">📞 Contacted</option>
          <option value="dismissed">❌ Dismissed</option>
        </select>
        <select value={langFilter} onChange={e => { setLangFilter(e.target.value); setPage(1) }} style={filterStyle}>
          <option value="">All Languages</option>
          <option value="en">🇬🇧 English</option>
          <option value="fr">🇫🇷 French</option>
          <option value="es">🇪🇸 Spanish</option>
          <option value="pt">🇧🇷 Portuguese</option>
          <option value="hi">🇮🇳 Hindi</option>
          <option value="de">🇩🇪 German</option>
          <option value="it">🇮🇹 Italian</option>
          <option value="nl">🇳🇱 Dutch</option>
          <option value="ar">🇸🇦 Arabic</option>
        </select>
        <select value={hasEmailFilter} onChange={e => { setHasEmailFilter(e.target.value); setPage(1) }} style={filterStyle}>
          <option value="">✉️ Any Email</option>
          <option value="1">Has Email</option>
        </select>
        <select value={hasPhoneFilter} onChange={e => { setHasPhoneFilter(e.target.value); setPage(1) }} style={filterStyle}>
          <option value="">📞 Any Phone</option>
          <option value="1">Has Phone</option>
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        {signals.map(s => (
          <div key={s.id} style={{
            background: '#1a1a1a', border: '1px solid', borderColor: STATUS_COLORS[s.status] || '#2a2a2a',
            borderRadius: 12, padding: 16,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 16 }}>{SOURCE_ICONS[s.source] || '📡'}</span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{s.source_name}</span>
                {s.language && <span style={{ color: '#666', fontSize: 11 }}>{s.language === 'ar' ? '🇸🇦' : s.language === 'fr' ? '🇫🇷' : '🇬🇧'} {s.language}</span>}
                <span style={{ color: '#666', fontSize: 12 }}>{formatTime(s.created_at)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  background: s.intent_score >= 80 ? '#00cc6620' : s.intent_score >= 50 ? '#ffaa0020' : '#2a2a2a',
                  color: s.intent_score >= 80 ? '#00cc66' : s.intent_score >= 50 ? '#ffaa00' : '#666',
                  padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                }}>{s.intent_score}/100</span>
                <span style={{
                  background: '#2a2a2a', color: STATUS_COLORS[s.status] || '#666',
                  padding: '2px 8px', borderRadius: 4, fontSize: 12, textTransform: 'capitalize',
                }}>{s.status.replace('_', ' ')}</span>
              </div>
            </div>

            {s.source_url && (
              <a href={s.source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#00d4ff', fontSize: 12, textDecoration: 'none', display: 'block', marginBottom: 8 }}>
                🔗 {s.source_url.slice(0, 60)}...
              </a>
            )}

            <p style={{ margin: '0 0 8px', fontSize: 13, color: '#ccc', lineHeight: 1.5 }}>
              "{s.content?.slice(0, 300)}{s.content?.length > 300 ? '...' : ''}"
            </p>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {s.email && <span style={{ background: '#00cc6620', color: '#00cc66', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>✉️ {s.email}</span>}
              {s.phone && <span style={{ background: '#8b5cf620', color: '#8b5cf6', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>📞 {s.phone}</span>}
              {s.groups_mentioned && <span style={{ background: '#ffaa0020', color: '#ffaa00', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>🔗 {s.groups_mentioned}</span>}
            </div>

            {s.pain_point && <div style={{ fontSize: 12, color: '#ff6b6b', marginBottom: 4 }}>😤 Pain: {s.pain_point}</div>}
            {s.opportunity && <div style={{ fontSize: 12, color: '#00cc66', marginBottom: 4 }}>💡 Opportunity: {s.opportunity}</div>}
            {s.lead_contact && <div style={{ fontSize: 12, color: '#8b5cf6', marginBottom: 8 }}>📞 Contact: {s.lead_contact}</div>}

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
              {s.status === 'new' && (
                <>
                  <button onClick={() => updateStatus(s.id, 'ad_created')} style={actionBtnStyle}>✏️ Write Ad</button>
                  <button onClick={() => updateStatus(s.id, 'page_built')} style={actionBtnStyle}>📄 Build Page</button>
                  <button onClick={() => updateStatus(s.id, 'contacted')} style={actionBtnStyle}>📞 Contact</button>
                  <button onClick={() => updateStatus(s.id, 'dismissed')} style={{ ...actionBtnStyle, background: '#2a2a2a', color: '#666' }}>❌ Dismiss</button>
                </>
              )}
              {s.status !== 'new' && (
                <button onClick={() => updateStatus(s.id, 'new')} style={{ ...actionBtnStyle, background: '#2a2a2a', color: '#666' }}>↩ Reset</button>
              )}
              <button onClick={() => enrichSignal(s.id)} style={{ ...actionBtnStyle, background: '#1a1a1a', border: '1px solid #2a2a2a' }}>🔄 Re-analyze</button>
            </div>
          </div>
        ))}
        {signals.length === 0 && (
          <div style={{ textAlign: 'center', color: '#666', padding: 40, background: '#1a1a1a', borderRadius: 12 }}>
            No signals yet. Click "Sniff Telegram" to find potential customers.
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={pageBtnStyle(page <= 1)}>← Prev</button>
          <span style={{ color: '#666', fontSize: 13, padding: '8px 12px' }}>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={pageBtnStyle(page >= totalPages)}>Next →</button>
        </div>
      )}
    </div>
  )
}

/* ========== SOURCES (Source performance table) ========== */
function SourcesSubTab() {
  const [sources, setSources] = useState(null)
  const [discovering, setDiscovering] = useState(null)
  const [adding, setAdding] = useState({ show: false, type: '', name: '' })

  function loadSources() {
    api.get('/demand/signals/sources').then(r => setSources(r.data)).catch(() => {})
  }

  useEffect(() => { loadSources() }, [])

  function triggerDiscovery(type) {
    setDiscovering(type)
    api.post('/demand/signals/sources/discover', { type }).then(r => {
      alert(`AI discovered ${r.data.added} new sources`)
      loadSources()
    }).catch(() => alert('Discovery failed')).finally(() => setDiscovering(null))
  }

  function addSource() {
    if (!adding.type || !adding.name.trim()) return
    api.post('/demand/signals/sources/add', { type: adding.type, name: adding.name.trim() })
      .then(() => { loadSources(); setAdding({ show: false, type: '', name: '' }) })
      .catch(() => alert('Add failed'))
  }

  function toggleSource(type, name, enabled) {
    api.post('/demand/signals/sources/toggle', { type, name, enabled })
      .then(() => loadSources()).catch(() => alert('Toggle failed'))
  }

  const PLATFORMS = [
    { key: 'telegram', label: '📱 Telegram', icon: '📱' },
    { key: 'reddit', label: '🤖 Reddit', icon: '🤖' },
    { key: 'youtube', label: '🎥 YouTube', icon: '🎥' },
    { key: 'twitter', label: '🐦 X/Twitter', icon: '🐦' },
  ]

  const badgeStyle = (val, good, medium) => ({
    background: val >= good ? '#00cc6620' : val >= medium ? '#ffaa0020' : '#2a2a2a',
    color: val >= good ? '#00cc66' : val >= medium ? '#ffaa00' : '#666',
    padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <p style={{ margin: 0, color: '#a0a0a0', fontSize: 13 }}>
          Sources are automatically ranked by lead yield. Top 10 + 5 new candidates are sniffed each cycle.
          Seeds 🛡️ are never pruned. AI discovers new sources every 4 cycles.
        </p>
        <button onClick={() => setAdding(s => ({ ...s, show: !s.show }))} style={{
          padding: '8px 16px', background: '#00d4ff', color: '#000', border: 'none',
          borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13,
        }}>+ Add Source</button>
      </div>

      {adding.show && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, padding: 16, background: '#1a1a1a', borderRadius: 12, border: '1px solid #2a2a2a', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', color: '#a0a0a0', fontSize: 12, marginBottom: 4 }}>Platform</label>
            <select value={adding.type} onChange={e => setAdding(s => ({ ...s, type: e.target.value }))}
              style={{ ...filterStyle, width: '100%' }}>
              <option value="">Select...</option>
              {PLATFORMS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
          <div style={{ flex: 2 }}>
            <label style={{ display: 'block', color: '#a0a0a0', fontSize: 12, marginBottom: 4 }}>Name</label>
            <input type="text" value={adding.name} onChange={e => setAdding(s => ({ ...s, name: e.target.value }))}
              placeholder="channel name / subreddit / search query"
              style={{ ...filterStyle, width: '100%' }} />
          </div>
          <button onClick={addSource} disabled={!adding.type || !adding.name.trim()}
            style={{ padding: '8px 20px', background: '#00cc66', color: '#000', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13, height: 38 }}>Add</button>
        </div>
      )}

      {PLATFORMS.map(platform => (
        <div key={platform.key} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, marginBottom: 20, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #2a2a2a' }}>
            <h3 style={{ margin: 0, fontSize: 15, color: '#00d4ff' }}>{platform.label}</h3>
            <button onClick={() => triggerDiscovery(platform.key)} disabled={discovering === platform.key}
              style={{ padding: '6px 14px', background: discovering === platform.key ? '#2a2a2a' : '#2a2a2a', border: '1px solid #2a2a2a', borderRadius: 6, color: discovering === platform.key ? '#666' : '#fff', cursor: discovering === platform.key ? 'default' : 'pointer', fontSize: 12 }}>
              {discovering === platform.key ? '🔍 Discovering...' : '🤖 AI Discover'}
            </button>
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ borderBottom: '1px solid #2a2a2a', color: '#666' }}>
                <th style={{ ...thStyle, width: '30%' }}>Name</th>
                <th style={{ ...thStyle, width: 60 }}>Leads</th>
                <th style={{ ...thStyle, width: 60 }}>Sniffs</th>
                <th style={{ ...thStyle, width: 50 }}>Rate</th>
                <th style={{ ...thStyle, width: 50 }}>Intent</th>
                <th style={{ ...thStyle, width: 80 }}>Origin</th>
                <th style={{ ...thStyle, width: 80 }}>Last</th>
                <th style={{ ...thStyle, width: 60 }}></th>
              </tr></thead>
              <tbody>
                {(sources?.[platform.key] || []).map(s => (
                  <tr key={s.name} style={{ borderBottom: '1px solid #2a2a2a', opacity: s.enabled ? 1 : 0.4 }}>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>
                      {s.discovered_by === 'seed' ? '🛡️ ' : s.discovered_by === 'ai_suggestion' ? '🤖 ' : s.discovered_by === 'manual' ? '👤 ' : '🔍 '}
                      {s.name}
                    </td>
                    <td style={tdStyle}>{s.lead_count}</td>
                    <td style={tdStyle}>{s.sniff_count}</td>
                    <td style={tdStyle}><span style={badgeStyle(s.lead_rate, 1, 0.1)}>{s.lead_rate}</span></td>
                    <td style={tdStyle}><span style={badgeStyle(s.avg_intent, 60, 30)}>{s.avg_intent}</span></td>
                    <td style={{ ...tdStyle, color: '#666', fontSize: 11 }}>{s.discovered_by}</td>
                    <td style={{ ...tdStyle, color: '#666', fontSize: 11 }}>{s.last_sniffed ? formatTime(s.last_sniffed) : 'Never'}</td>
                    <td style={tdStyle}>
                      <button onClick={() => toggleSource(platform.key, s.name, !s.enabled)}
                        style={{ background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 4, padding: '3px 8px', color: '#666', cursor: 'pointer', fontSize: 11 }}>
                        {s.enabled ? '⏸️' : '▶️'}
                      </button>
                    </td>
                  </tr>
                ))}
                {(!sources || !sources[platform.key]?.length) && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: '#666', padding: 20 }}>No sources yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ========== ANALYTICS (Landing page stats) ========== */
function AnalyticsSubTab() {
  const [data, setData] = useState(null)

  function loadAnalytics() {
    api.get('/admin/pages/analytics').then(r => setData(r.data)).catch(() => {})
  }

  useEffect(() => { loadAnalytics() }, [])

  const SparkBar = ({ visits, max }) => {
    const barH = max > 0 ? (visits / max) * 100 : 0
    return (
      <div style={{ width: 40, height: 24, display: 'flex', alignItems: 'flex-end', gap: 1 }}>
        <div style={{ width: '100%', height: `${Math.max(barH, 2)}%`, background: '#00d4ff', borderRadius: '2px 2px 0 0', minHeight: 2 }} />
      </div>
    )
  }

  const weekDays = data?.daily || []
  const maxVisits = Math.max(...weekDays.map(d => d.visits), 1)

  return (
    <div>
      <h3 style={{ margin: '0 0 20px', fontSize: 16, color: '#00d4ff' }}>📊 Landing Page Analytics</h3>

      {data && (
        <>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
            <div style={statCardStyle}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#00d4ff' }}>{data.total_visits}</div>
              <div style={{ fontSize: 12, color: '#666' }}>Total Visits</div>
            </div>
            <div style={statCardStyle}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#00cc66' }}>{data.total_conversions}</div>
              <div style={{ fontSize: 12, color: '#666' }}>Total Conversions</div>
            </div>
            <div style={statCardStyle}>
              <div style={{ fontSize: 28, fontWeight: 700, color: data.total_visits > 0 ? '#ffaa00' : '#666' }}>
                {data.total_visits > 0 ? ((data.total_conversions / data.total_visits) * 100).toFixed(1) + '%' : '0%'}
              </div>
              <div style={{ fontSize: 12, color: '#666' }}>Conversion Rate</div>
            </div>
            <div style={statCardStyle}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{data.perPage.length}</div>
              <div style={{ fontSize: 12, color: '#666' }}>Landing Pages</div>
            </div>
          </div>

          {weekDays.length > 0 && (
            <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 20, marginBottom: 24 }}>
              <h4 style={{ margin: '0 0 16px', fontSize: 14, color: '#a0a0a0' }}>Last 30 Days — Daily Visits</h4>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120, padding: '0 4px' }}>
                {weekDays.map((d, i) => {
                  const h = maxVisits > 0 ? (d.visits / maxVisits) * 100 : 0
                  return (
                    <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <div style={{ width: '100%', height: `${Math.max(h, 2)}%`, background: d.visits > 0 ? '#00d4ff' : '#1a1a1a', borderRadius: '3px 3px 0 0', minHeight: 2, transition: 'height .3s', position: 'relative' }}
                        title={`${d.date}: ${d.visits} visits`}>
                        {d.visits > 0 && (
                          <div style={{ position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)', fontSize: 10, color: '#00d4ff', whiteSpace: 'nowrap' }}>{d.visits}</div>
                        )}
                      </div>
                      {weekDays.length <= 31 && (
                        <span style={{ fontSize: 9, color: '#555', writingMode: 'vertical-lr', textOrientation: 'mixed', height: 14 }}>{d.date.slice(5)}</span>
                      )}
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555', fontSize: 10, marginTop: 4 }}>
                <span>{weekDays[0]?.date || ''}</span>
                <span>Today</span>
              </div>
            </div>
          )}

          <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: 14, color: '#a0a0a0' }}>Per-Page Performance</h4>
              <span style={{ color: '#666', fontSize: 12 }}>Last 7 days →</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ borderBottom: '1px solid #2a2a2a', color: '#666' }}>
                <th style={thStyle}>Page</th>
                <th style={thStyle}>Keyword</th>
                <th style={thStyle}>Visits</th>
                <th style={thStyle}>Conv.</th>
                <th style={{ ...thStyle, width: 80 }}>Rate</th>
                <th style={{ ...thStyle, width: 120 }}>7-Day Trend</th>
              </tr></thead>
              <tbody>
                {data.perPage.map(p => {
                  const trend = data.topPages?.find(t => t.slug === p.slug)
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                      <td style={tdStyle}>{p.title}</td>
                      <td style={{ ...tdStyle, color: '#a0a0a0', fontSize: 12 }}>{p.keyword || '-'}</td>
                      <td style={tdStyle}>{p.visits}</td>
                      <td style={tdStyle}>{p.conversions}</td>
                      <td style={tdStyle}>
                        <span style={{
                          background: p.conversion_rate >= 5 ? '#00cc6620' : p.conversion_rate >= 1 ? '#ffaa0020' : '#2a2a2a',
                          color: p.conversion_rate >= 5 ? '#00cc66' : p.conversion_rate >= 1 ? '#ffaa00' : '#666',
                          padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                        }}>{p.conversion_rate}%</span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <SparkBar visits={trend?.visits || 0} max={Math.max(...(data.topPages || []).map(t => t.visits), 1)} />
                          <span style={{ color: '#666', fontSize: 11 }}>{trend?.visits || 0}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {data.perPage.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: '#666', padding: 30 }}>No landing pages yet — build one from the Audit tab.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!data && <p style={{ color: '#666', textAlign: 'center', padding: 40 }}>Loading analytics...</p>}
    </div>
  )
}

/* ========== SETTINGS (All Sniffers config) ========== */
const SNIFFER_CONFIGS = [
  {
    key: 'telegram', label: '📱 Telegram Sniffer', icon: '📱',
    fields: [
      { key: 'telegram_channels', label: 'Channels (comma-separated)', type: 'text', placeholder: 'iptvchat, iptvcommunity, arabic_iptv' },
      { key: 'telegram_sniffer_interval', label: 'Interval', type: 'select', options: [{ v: '1', l: 'Every hour' }, { v: '3', l: 'Every 3 hours' }, { v: '6', l: 'Every 6 hours' }, { v: '12', l: 'Every 12 hours' }, { v: '24', l: 'Once a day' }] },
      { key: 'telegram_sniffer_enabled', label: 'Enabled', type: 'select', options: [{ v: '1', l: '✅ Enabled' }, { v: '0', l: '❌ Disabled' }] },
    ],
  },
  {
    key: 'reddit', label: '🤖 Reddit Sniffer', icon: '🤖',
    fields: [
      { key: 'reddit_channels', label: 'Subreddits (comma-separated)', type: 'text', placeholder: 'iptv, IPTVReview, cordcutters' },
      { key: 'reddit_sniffer_interval', label: 'Interval', type: 'select', options: [{ v: '1', l: 'Every hour' }, { v: '3', l: 'Every 3 hours' }, { v: '6', l: 'Every 6 hours' }, { v: '12', l: 'Every 12 hours' }, { v: '24', l: 'Once a day' }] },
      { key: 'reddit_sniffer_enabled', label: 'Enabled', type: 'select', options: [{ v: '1', l: '✅ Enabled' }, { v: '0', l: '❌ Disabled' }] },
    ],
  },
  {
    key: 'youtube', label: '🎥 YouTube Sniffer', icon: '🎥',
    fields: [
      { key: 'youtube_channels', label: 'Search queries (comma-separated)', type: 'text', placeholder: 'iptv review, best iptv 2026, iptv subscription' },
      { key: 'youtube_api_key', label: 'YouTube Data API Key', type: 'password', placeholder: 'Paste your API key' },
      { key: 'youtube_sniffer_interval', label: 'Interval', type: 'select', options: [{ v: '1', l: 'Every hour' }, { v: '3', l: 'Every 3 hours' }, { v: '6', l: 'Every 6 hours' }, { v: '12', l: 'Every 12 hours' }, { v: '24', l: 'Once a day' }] },
      { key: 'youtube_sniffer_enabled', label: 'Enabled', type: 'select', options: [{ v: '1', l: '✅ Enabled' }, { v: '0', l: '❌ Disabled' }] },
    ],
  },
  {
    key: 'twitter', label: '🐦 X/Twitter Sniffer', icon: '🐦',
    fields: [
      { key: 'twitter_channels', label: 'Search keywords (comma-separated)', type: 'text', placeholder: 'iptv, iptv streaming, best iptv' },
      { key: 'twitter_sniffer_interval', label: 'Interval', type: 'select', options: [{ v: '1', l: 'Every hour' }, { v: '3', l: 'Every 3 hours' }, { v: '6', l: 'Every 6 hours' }, { v: '12', l: 'Every 12 hours' }, { v: '24', l: 'Once a day' }] },
      { key: 'twitter_sniffer_enabled', label: 'Enabled', type: 'select', options: [{ v: '1', l: '✅ Enabled' }, { v: '0', l: '❌ Disabled' }] },
    ],
  },
]

function SettingsSubTab() {
  const [settings, setSettings] = useState({})
  const [editSettings, setEditSettings] = useState({})
  const [savingSettings, setSavingSettings] = useState(false)
  const [showKeys, setShowKeys] = useState({})

  function loadSettings() {
    api.get('/demand/settings').then(r => {
      setSettings(r.data)
      setEditSettings(r.data)
    }).catch(() => {})
  }

  useEffect(loadSettings, [])

  function saveSettings() {
    setSavingSettings(true)
    api.put('/demand/settings', editSettings).then(() => {
      setSettings({ ...editSettings })
      loadSettings()
    }).catch(() => alert('Save failed')).finally(() => setSavingSettings(false))
  }

  const inputStyle = {
    padding: '10px 14px', borderRadius: 8, border: '1px solid #2a2a2a',
    background: '#0f0f0f', color: '#fff', fontSize: 14, outline: 'none',
    width: '100%', boxSizing: 'border-box',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#00d4ff' }}>📈 Rank Tracking</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', color: '#a0a0a0', fontSize: 13, marginBottom: 4 }}>SerpAPI Key</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type={showKeys.serpapi_key ? 'text' : 'password'} value={editSettings.serpapi_key || ''}
                onChange={e => setEditSettings(s => ({ ...s, serpapi_key: e.target.value }))}
                placeholder="Get a key at serpapi.com" style={{ flex: 1, ...inputStyle }} />
              <button onClick={() => setShowKeys(s => ({ ...s, serpapi_key: !s.serpapi_key }))}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, padding: '4px 6px', color: '#666' }}>
                {showKeys.serpapi_key ? '🙈' : '👁️'}
              </button>
            </div>
            <p style={{ color: '#555', fontSize: 11, marginTop: 4 }}>Get a free API key at <a href="https://serpapi.com" target="_blank" rel="noreferrer" style={{ color: '#00d4ff' }}>serpapi.com</a> (100 free searches/month)</p>
          </div>
          <div>
            <label style={{ display: 'block', color: '#a0a0a0', fontSize: 13, marginBottom: 4 }}>Auto-Check Interval</label>
            <select value={editSettings.rank_check_interval || '24'} onChange={e => setEditSettings(s => ({ ...s, rank_check_interval: e.target.value }))} style={inputStyle}>
              <option value="0">Disabled</option>
              <option value="1">Every hour</option>
              <option value="3">Every 3 hours</option>
              <option value="6">Every 6 hours</option>
              <option value="12">Every 12 hours</option>
              <option value="24">Once a day</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#00d4ff' }}>🤖 Auto-Build Pages from Leads</h3>
        <p style={{ color: '#666', fontSize: 12, marginBottom: 16 }}>Automatically generates landing pages from high-intent demand signals. When a lead has intent_score ≥ threshold, a targeted page is built and the lead is marked "page_built".</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', color: '#a0a0a0', fontSize: 13, marginBottom: 4 }}>Auto-Build</label>
            <select value={editSettings.auto_build_enabled || '1'} onChange={e => setEditSettings(s => ({ ...s, auto_build_enabled: e.target.value }))} style={inputStyle}>
              <option value="1">✅ Enabled</option>
              <option value="0">❌ Disabled</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', color: '#a0a0a0', fontSize: 13, marginBottom: 4 }}>Min Intent Score</label>
            <input type="number" min="1" max="100" value={editSettings.auto_build_threshold || '70'}
              onChange={e => setEditSettings(s => ({ ...s, auto_build_threshold: e.target.value }))}
              style={inputStyle} />
            <p style={{ color: '#555', fontSize: 11, marginTop: 2 }}>Leads with intent_score ≥ this value will auto-build pages</p>
          </div>
          <div>
            <label style={{ display: 'block', color: '#a0a0a0', fontSize: 13, marginBottom: 4 }}>Max Pages Per Run</label>
            <input type="number" min="1" max="50" value={editSettings.auto_build_max_per_run || '5'}
              onChange={e => setEditSettings(s => ({ ...s, auto_build_max_per_run: e.target.value }))}
              style={inputStyle} />
            <p style={{ color: '#555', fontSize: 11, marginTop: 2 }}>Maximum landing pages to build in a single cron run</p>
          </div>
          <div>
            <label style={{ display: 'block', color: '#a0a0a0', fontSize: 13, marginBottom: 4 }}>Check Interval</label>
            <select value={editSettings.auto_build_interval || '6'} onChange={e => setEditSettings(s => ({ ...s, auto_build_interval: e.target.value }))} style={inputStyle}>
              <option value="1">Every hour</option>
              <option value="3">Every 3 hours</option>
              <option value="6">Every 6 hours</option>
              <option value="12">Every 12 hours</option>
              <option value="24">Once a day</option>
            </select>
          </div>
          <div style={{ marginTop: 8 }}>
            <button onClick={() => {
              api.post('/admin/seo/auto-build').then(() => {
                alert('Auto-build triggered! Check Audit tab for new pages.')
              }).catch(e => alert(e.response?.data?.error || 'Failed'))
            }} style={{
              padding: '8px 16px', background: '#ffaa00', color: '#000', border: 'none',
              borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13,
            }}>▶ Run Auto-Build Now</button>
          </div>
        </div>
      </div>
      {SNIFFER_CONFIGS.map(sniffer => (
        <div key={sniffer.key} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#00d4ff' }}>{sniffer.label}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sniffer.fields.map(f => (
              <div key={f.key}>
                <label style={{ display: 'block', color: '#a0a0a0', fontSize: 13, marginBottom: 4 }}>{f.label}</label>
                {f.type === 'select' ? (
                  <select value={editSettings[f.key] || f.options[0].v} onChange={e => setEditSettings(s => ({ ...s, [f.key]: e.target.value }))} style={inputStyle}>
                    {f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                ) : f.type === 'password' ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type={showKeys[f.key] ? 'text' : 'password'} value={editSettings[f.key] || ''}
                      onChange={e => setEditSettings(s => ({ ...s, [f.key]: e.target.value }))}
                      placeholder={f.placeholder} style={{ flex: 1, ...inputStyle }} />
                    <button onClick={() => setShowKeys(s => ({ ...s, [f.key]: !s[f.key] }))}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, padding: '4px 6px', color: '#666' }}>
                      {showKeys[f.key] ? '🙈' : '👁️'}
                    </button>
                  </div>
                ) : (
                  <input type="text" value={editSettings[f.key] || ''}
                    onChange={e => setEditSettings(s => ({ ...s, [f.key]: e.target.value }))}
                    placeholder={f.placeholder} style={inputStyle} />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={saveSettings} disabled={savingSettings} style={{
          padding: '10px 24px', background: savingSettings ? '#2a2a2a' : '#ffaa00',
          color: savingSettings ? '#666' : '#000', border: 'none', borderRadius: 8,
          fontWeight: 600, cursor: savingSettings ? 'default' : 'pointer', fontSize: 14,
        }}>{savingSettings ? 'Saving...' : 'Save All Settings'}</button>
      </div>
    </div>
  )
}

const thStyle = { textAlign: 'left', padding: '10px 14px', fontWeight: 500 }
const tdStyle = { padding: '10px 14px' }

const statCardStyle = {
  background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10,
  padding: '12px 18px', flex: 1, minWidth: 100,
}

const filterStyle = {
  padding: '8px 12px', borderRadius: 8, border: '1px solid #2a2a2a',
  background: '#0f0f0f', color: '#fff', fontSize: 13, outline: 'none', cursor: 'pointer',
}

const actionBtnStyle = {
  padding: '5px 12px', background: '#2a2a2a', color: '#fff', border: 'none',
  borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600,
}

const pageBtnStyle = (disabled) => ({
  padding: '6px 14px', background: disabled ? '#1a1a1a' : '#2a2a2a',
  color: disabled ? '#444' : '#fff', border: '1px solid #2a2a2a', borderRadius: 6,
  cursor: disabled ? 'default' : 'pointer', fontSize: 13,
})