import { useState, useEffect } from 'react'
import api from '../../api'

const SOURCES = ['', 'telegram', 'reddit', 'twitter', 'youtube', 'manual']
const LANGUAGES = ['', 'en', 'fr', 'es', 'pt', 'ar', 'de', 'it', 'nl', 'tr', 'pl', 'ru']
const STATUSES = ['', 'new', 'ad_created', 'page_built', 'contacted']

export default function Campaigns() {
  const [stats, setStats] = useState(null)
  const [leads, setLeads] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [templates, setTemplates] = useState([])
  const [history, setHistory] = useState([])
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyPage, setHistoryPage] = useState(1)
  const [activeTab, setActiveTab] = useState('leads')

  const [filters, setFilters] = useState({
    source: '', language: '', intent_min: '', intent_max: '',
    hasEmail: '', hasPhone: '', status: '', search: '',
  })

  const [blast, setBlast] = useState({
    name: '', template_key: '', filters: {},
  })

  useEffect(() => {
    loadStats()
    loadTemplates()
    loadHistory()
  }, [])

  useEffect(() => {
    loadLeads()
  }, [page, filters])

  async function loadStats() {
    try {
      const r = await api.get('/campaigns/leads/stats')
      setStats(r.data)
    } catch (e) { console.error(e) }
  }

  async function loadLeads() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', page)
      params.set('limit', '50')
      for (const [k, v] of Object.entries(filters)) {
        if (v) params.set(k, v)
      }
      const r = await api.get(`/campaigns/leads?${params}`)
      setLeads(r.data.leads)
      setTotal(r.data.total)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  async function loadTemplates() {
    try {
      const r = await api.get('/campaigns/templates')
      setTemplates(r.data)
    } catch (e) { console.error(e) }
  }

  async function loadHistory() {
    try {
      const r = await api.get(`/campaigns/history?page=${historyPage}&limit=20`)
      setHistory(r.data.campaigns)
      setHistoryTotal(r.data.total)
    } catch (e) { console.error(e) }
  }

  function handleFilter(key, value) {
    setFilters(f => ({ ...f, [key]: value }))
    setPage(1)
  }

  function clearFilters() {
    setFilters({ source: '', language: '', intent_min: '', intent_max: '', hasEmail: '', hasPhone: '', status: '', search: '' })
    setPage(1)
  }

  async function handleBlast() {
    if (!blast.name || !blast.template_key) return alert('Campaign name and template required')
    setSending(true)
    try {
      const r = await api.post('/campaigns/blast', {
        name: blast.name,
        template_key: blast.template_key,
        filters: blast.filters,
      })
      alert(`Campaign sent! ${r.data.sent} delivered, ${r.data.failed} failed out of ${r.data.total} leads`)
      setBlast({ name: '', template_key: '', filters: {} })
      loadStats()
      loadHistory()
    } catch (e) {
      alert('Error: ' + (e.response?.data?.error || e.message))
    }
    setSending(false)
  }

  function useCurrentFilters() {
    const active = {}
    for (const [k, v] of Object.entries(filters)) {
      if (v && k !== 'search') active[k] = v
    }
    setBlast(b => ({ ...b, filters: active }))
  }

  const totalPages = Math.ceil(total / 50)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Leads & Campaigns</h2>
          <p className="text-gray-400 text-sm mt-1">View all leads, filter by criteria, and send email campaigns</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadStats} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm">🔄 Refresh</button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          <StatCard label="Total Leads" value={stats.totalLeads} color="cyan" />
          <StatCard label="With Email" value={stats.withEmail} color="green" />
          <StatCard label="With Phone" value={stats.withPhone} color="blue" />
          <StatCard label="Both" value={stats.withBoth} color="purple" />
          <StatCard label="Orders" value={stats.orders} color="orange" />
          <StatCard label="Completed" value={stats.ordersCompleted} color="green" />
        </div>
      )}

      {/* Source & Language breakdown */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-800 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-3">By Source</h4>
            <div className="space-y-1.5">
              {stats.bySource?.slice(0, 8).map(s => (
                <div key={s.source} className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{s.source || 'unknown'}</span>
                  <span className="text-white font-medium">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-3">By Language</h4>
            <div className="space-y-1.5">
              {stats.byLanguage?.slice(0, 8).map(s => (
                <div key={s.lang} className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{s.lang === 'unknown' ? 'Unknown' : s.lang.toUpperCase()}</span>
                  <span className="text-white font-medium">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs: Leads | Blast | History */}
      <div className="flex gap-2 mb-6 border-b border-gray-700 pb-2">
        {['leads', 'blast', 'history'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium capitalize ${
              activeTab === tab ? 'bg-cyan-500 text-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab === 'leads' ? `📋 Leads (${total})` : tab === 'blast' ? '📢 Campaign Blast' : '📜 History'}
          </button>
        ))}
      </div>

      {/* ───── LEADS TAB ───── */}
      {activeTab === 'leads' && (
        <div>
          {/* Filters */}
          <div className="bg-gray-800 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              <select value={filters.source} onChange={e => handleFilter('source', e.target.value)}
                className="bg-gray-700 text-white px-2 py-1.5 rounded-lg text-sm">
                <option value="">All sources</option>
                {SOURCES.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filters.language} onChange={e => handleFilter('language', e.target.value)}
                className="bg-gray-700 text-white px-2 py-1.5 rounded-lg text-sm">
                <option value="">All languages</option>
                {LANGUAGES.filter(Boolean).map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
              </select>
              <input type="number" placeholder="Intent min" value={filters.intent_min}
                onChange={e => handleFilter('intent_min', e.target.value)}
                className="bg-gray-700 text-white px-2 py-1.5 rounded-lg text-sm w-full" />
              <input type="number" placeholder="Intent max" value={filters.intent_max}
                onChange={e => handleFilter('intent_max', e.target.value)}
                className="bg-gray-700 text-white px-2 py-1.5 rounded-lg text-sm w-full" />
              <select value={filters.hasEmail} onChange={e => handleFilter('hasEmail', e.target.value)}
                className="bg-gray-700 text-white px-2 py-1.5 rounded-lg text-sm">
                <option value="">Email: Any</option>
                <option value="true">Has email</option>
                <option value="false">No email</option>
              </select>
              <select value={filters.hasPhone} onChange={e => handleFilter('hasPhone', e.target.value)}
                className="bg-gray-700 text-white px-2 py-1.5 rounded-lg text-sm">
                <option value="">Phone: Any</option>
                <option value="true">Has phone</option>
                <option value="false">No phone</option>
              </select>
              <select value={filters.status} onChange={e => handleFilter('status', e.target.value)}
                className="bg-gray-700 text-white px-2 py-1.5 rounded-lg text-sm">
                <option value="">All status</option>
                {STATUSES.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input type="text" placeholder="Search..." value={filters.search}
                onChange={e => handleFilter('search', e.target.value)}
                className="bg-gray-700 text-white px-2 py-1.5 rounded-lg text-sm w-full" />
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-white">✕ Clear filters</button>
              <button onClick={useCurrentFilters} className="text-xs text-cyan-400 hover:text-cyan-300 ml-auto"
                title="Use current filters for campaign blast">📢 Use as campaign target</button>
            </div>
          </div>

          {/* Leads Table */}
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700 text-left">
                    <th className="py-2 px-3">Intent</th>
                    <th className="py-2 px-3">Email</th>
                    <th className="py-2 px-3">Phone</th>
                    <th className="py-2 px-3">Source</th>
                    <th className="py-2 px-3">Lang</th>
                    <th className="py-2 px-3">Author</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Order</th>
                    <th className="py-2 px-3">Pain Point</th>
                    <th className="py-2 px-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map(l => (
                    <tr key={l.id} className="border-b border-gray-700/30 hover:bg-gray-750">
                      <td className="py-2 px-3">
                        <span className={`font-bold text-sm ${
                          l.intent_score >= 80 ? 'text-red-400' :
                          l.intent_score >= 60 ? 'text-yellow-400' :
                          l.intent_score >= 30 ? 'text-blue-400' : 'text-gray-500'
                        }`}>{l.intent_score}</span>
                      </td>
                      <td className="py-2 px-3 text-gray-300 max-w-[180px] truncate">{l.email || '—'}</td>
                      <td className="py-2 px-3 text-gray-400 text-xs">{l.phone || '—'}</td>
                      <td className="py-2 px-3">
                        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{l.source}</span>
                      </td>
                      <td className="py-2 px-3 text-gray-400 text-xs">{l.language || '?'}</td>
                      <td className="py-2 px-3 text-gray-400 text-xs max-w-[120px] truncate">{l.author || l.lead_contact || '—'}</td>
                      <td className="py-2 px-3">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          l.status === 'new' ? 'bg-blue-900 text-blue-300' :
                          l.status === 'contacted' ? 'bg-green-900 text-green-300' :
                          'bg-gray-700 text-gray-400'
                        }`}>{l.status}</span>
                      </td>
                      <td className="py-2 px-3">{l.has_order ? <span className="text-green-400 text-xs">✓</span> : '—'}</td>
                      <td className="py-2 px-3 text-gray-500 text-xs max-w-[200px] truncate" title={l.pain_point}>{l.pain_point || '—'}</td>
                      <td className="py-2 px-3 text-gray-500 text-xs whitespace-nowrap">{l.created_at?.split(' ')[0] || l.created_at?.split('T')[0] || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {loading && <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>}
            {!loading && leads.length === 0 && <div className="p-8 text-center text-gray-500">No leads match the filters</div>}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-3 border-t border-gray-700">
                <span className="text-gray-400 text-xs">{total} total leads</span>
                <div className="flex gap-1">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1 text-xs rounded bg-gray-700 text-gray-300 disabled:opacity-40">←</button>
                  <span className="px-3 py-1 text-xs text-gray-400">{page} / {totalPages}</span>
                  <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1 text-xs rounded bg-gray-700 text-gray-300 disabled:opacity-40">→</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───── BLAST TAB ───── */}
      {activeTab === 'blast' && (
        <div className="max-w-2xl">
          <div className="bg-gray-800 rounded-xl p-5 mb-4">
            <h3 className="text-lg font-semibold text-white mb-4">📢 Send Campaign Blast</h3>
            <p className="text-gray-400 text-sm mb-4">Send an email blast to all leads matching the selected filters.</p>

            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-xs block mb-1">Campaign Name</label>
                <input type="text" placeholder="e.g. World Cup 2026 Promotion"
                  value={blast.name} onChange={e => setBlast(b => ({ ...b, name: e.target.value }))}
                  className="bg-gray-700 text-white px-3 py-2 rounded-lg text-sm w-full" />
              </div>

              <div>
                <label className="text-gray-400 text-xs block mb-1">Email Template</label>
                <select value={blast.template_key}
                  onChange={e => setBlast(b => ({ ...b, template_key: e.target.value }))}
                  className="bg-gray-700 text-white px-3 py-2 rounded-lg text-sm w-full">
                  <option value="">Select a template...</option>
                  {templates.map(t => (
                    <option key={t.template_key} value={t.template_key}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-gray-400 text-xs block mb-1">Target Filters</label>
                <div className="bg-gray-900 rounded-lg p-3 text-sm">
                  {Object.keys(blast.filters).length === 0 ? (
                    <span className="text-gray-500">No filters set — will blast ALL leads with emails</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(blast.filters).map(([k, v]) => (
                        <span key={k} className="bg-gray-700 text-cyan-300 px-2 py-1 rounded text-xs">
                          {k}: {String(v)}
                          <button className="ml-1 text-gray-500 hover:text-white"
                            onClick={() => setBlast(b => {
                              const f = { ...b.filters }
                              delete f[k]
                              return { ...b, filters: f }
                            })}>✕</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <button onClick={useCurrentFilters}
                    className="mt-2 text-xs text-cyan-400 hover:text-cyan-300">📋 Use current lead filters</button>
                </div>
              </div>

              <button onClick={handleBlast} disabled={sending || !blast.name || !blast.template_key}
                className="bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-600 text-black font-semibold px-6 py-2.5 rounded-lg text-sm w-full">
                {sending ? 'Sending...' : '🚀 Send Campaign Blast'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───── HISTORY TAB ───── */}
      {activeTab === 'history' && (
        <div>
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700 text-left">
                    <th className="py-2 px-3">Campaign</th>
                    <th className="py-2 px-3">Template</th>
                    <th className="py-2 px-3">Leads</th>
                    <th className="py-2 px-3">Sent</th>
                    <th className="py-2 px-3">Failed</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Sent At</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(c => (
                    <tr key={c.id} className="border-b border-gray-700/30 hover:bg-gray-750">
                      <td className="py-2 px-3 text-gray-200 font-medium">{c.name}</td>
                      <td className="py-2 px-3 text-gray-400 text-xs">{c.template_key}</td>
                      <td className="py-2 px-3 text-gray-300">{c.total_leads}</td>
                      <td className="py-2 px-3 text-green-400">{c.emails_sent}</td>
                      <td className="py-2 px-3 text-red-400">{c.emails_failed}</td>
                      <td className="py-2 px-3">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          c.status === 'sent' ? 'bg-green-900 text-green-300' :
                          c.status === 'sending' ? 'bg-yellow-900 text-yellow-300' :
                          'bg-gray-700 text-gray-400'
                        }`}>{c.status}</span>
                      </td>
                      <td className="py-2 px-3 text-gray-500 text-xs whitespace-nowrap">{c.sent_at || c.created_at?.split('T')[0] || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {history.length === 0 && <div className="p-8 text-center text-gray-500">No campaigns sent yet</div>}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }) {
  const colors = {
    cyan: 'border-cyan-500/30 bg-cyan-500/5',
    green: 'border-green-500/30 bg-green-500/5',
    blue: 'border-blue-500/30 bg-blue-500/5',
    purple: 'border-purple-500/30 bg-purple-500/5',
    orange: 'border-orange-500/30 bg-orange-500/5',
  }
  return (
    <div className={`rounded-xl p-3 border ${colors[color] || colors.cyan}`}>
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-gray-400 text-xs mt-0.5">{label}</div>
    </div>
  )
}
