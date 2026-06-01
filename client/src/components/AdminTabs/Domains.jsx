import { useState, useEffect, useCallback } from 'react'
import api from '../../api'

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #2a2a2a',
  background: '#0f0f0f', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box',
}
const btnStyle = {
  background: '#00d4ff', color: '#000', border: 'none', padding: '10px 20px',
  borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14, whiteSpace: 'nowrap',
}

const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV']
const LOOKUP_TYPES = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME']

function emptyRecord() {
  return { name: '', type: 'A', address: '', mxPref: 10, ttl: 1800, _new: true }
}

async function dnsLookup(domain, type) {
  const url = `https://dns.google/resolve?name=${domain}&type=${type}`
  try {
    const res = await fetch(url)
    const data = await res.json()
    if (data.Status === 0 && data.Answer) {
      return data.Answer.map(a => ({ type, name: a.name, value: a.data, ttl: a.TTL }))
    }
    return []
  } catch {
    return []
  }
}

export default function Domains() {
  const [domains, setDomains] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [selectedDomain, setSelectedDomain] = useState(null)
  const [page, setPage] = useState(1)
  const pageSize = 50

  // DNS state
  const [dnsRecords, setDnsRecords] = useState(null)
  const [dnsInfo, setDnsInfo] = useState(null)
  const [dnsLoading, setDnsLoading] = useState(false)
  const [dnsSaving, setDnsSaving] = useState(false)
  const [dnsError, setDnsError] = useState(null)
  const [dnsSuccess, setDnsSuccess] = useState(null)

  // Public DNS lookup for search results
  const [lookedUpDomain, setLookedUpDomain] = useState(null)
  const [lookupRecords, setLookupRecords] = useState(null)
  const [lookupLoading, setLookupLoading] = useState(false)

  function load() {
    setLoading(true)
    setError(null)
    api.get('/admin/namecheap/domains', { params: { page, pageSize } }).then(r => {
      setDomains(r.data.domains || [])
      setTotal(r.data.total || 0)
    }).catch(e => {
      const msg = e.response?.data?.error || e.message
      if (msg.includes('not configured')) {
        setError('Namecheap API not configured. Go to Settings → Namecheap API to add your credentials.')
      } else {
        setError(msg)
      }
    }).finally(() => setLoading(false))
  }

  useEffect(load, [page])

  function handleSearch() {
    const names = searchQuery.split(',').map(s => s.trim()).filter(Boolean)
    if (names.length === 0) return
    setSearching(true)
    setSearchResults(null)
    api.post('/admin/namecheap/domains/check', { domains: names }).then(r => {
      setSearchResults(r.data)
    }).catch(e => {
      setSearchResults([{ domain: searchQuery, available: false, error: e.response?.data?.error || e.message }])
    }).finally(() => setSearching(false))
  }

  async function lookupDomain(domain) {
    if (lookedUpDomain === domain) { setLookedUpDomain(null); setLookupRecords(null); return }
    setLookedUpDomain(domain)
    setLookupLoading(true)
    setLookupRecords(null)
    const results = await Promise.all(LOOKUP_TYPES.map(t => dnsLookup(domain, t)))
    setLookupRecords(results.flat())
    setLookupLoading(false)
  }

  const loadDns = useCallback(async (domainName) => {
    setDnsLoading(true)
    setDnsError(null)
    setDnsSuccess(null)
    try {
      const res = await api.get(`/admin/namecheap/domains/${domainName}/dns`)
      setDnsInfo({ domain: res.data.domain, isUsingOurDNS: res.data.isUsingOurDNS, nameservers: res.data.nameservers, emailType: res.data.emailType })
      setDnsRecords(res.data.records.map(r => ({ ...r, _new: false })))
    } catch (e) {
      setDnsError(e.response?.data?.error || e.message)
      setDnsRecords([])
    }
    setDnsLoading(false)
  }, [])

  function viewDetails(d) {
    if (selectedDomain?.name === d.name) {
      setSelectedDomain(null)
      setDnsRecords(null)
      setDnsInfo(null)
    } else {
      setSelectedDomain(d)
      loadDns(d.name)
    }
  }

  function addRecord() {
    setDnsRecords(prev => [...(prev || []), emptyRecord()])
  }

  function removeRecord(idx) {
    setDnsRecords(prev => prev.filter((_, i) => i !== idx))
  }

  function updateRecord(idx, field, value) {
    setDnsRecords(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  async function saveDns() {
    if (!selectedDomain || !dnsRecords) return
    setDnsSaving(true)
    setDnsError(null)
    setDnsSuccess(null)
    try {
      // Strip _new flag before sending
      const clean = dnsRecords.map(({ _new, ...r }) => r)
      const res = await api.put(`/admin/namecheap/domains/${selectedDomain.name}/dns`, { records: clean })
      setDnsRecords(res.data.records.map(r => ({ ...r, _new: false })))
      setDnsInfo({
        domain: res.data.domain,
        isUsingOurDNS: res.data.isUsingOurDNS,
        nameservers: res.data.nameservers,
        emailType: res.data.emailType,
      })
      setDnsSuccess('DNS records saved successfully!')
      setTimeout(() => setDnsSuccess(null), 4000)
    } catch (e) {
      setDnsError(e.response?.data?.error || e.message)
    }
    setDnsSaving(false)
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <p style={{ color: '#666', margin: 0 }}>{total > 0 ? `${total} domains` : ''}</p>
        <button onClick={load} style={btnStyle} disabled={loading}>
          {loading ? 'Loading...' : '↻ Refresh'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#ff444415', border: '1px solid #ff444433', borderRadius: 12, padding: 20, marginBottom: 20, color: '#ff6666', fontSize: 14 }}>
          {error}
        </div>
      )}

      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            placeholder="Search domain availability (e.g. example.com, mydomain.net)"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            style={{ flex: 1, ...inputStyle }}
          />
          <button onClick={handleSearch} style={btnStyle} disabled={searching}>
            {searching ? '...' : 'Check'}
          </button>
        </div>
        {searchResults && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {searchResults.map((r, i) => (
                <span key={i} onClick={() => !r.available && !r.error && lookupDomain(r.domain)}
                  style={{
                    padding: '6px 12px', borderRadius: 8, fontSize: 13,
                    background: r.available ? '#00cc6615' : r.error ? '#ff444415' : '#ff444415',
                    border: '1px solid', borderColor: r.available ? '#00cc6644' : r.error ? '#ff444444' : '#ff444444',
                    color: r.available ? '#00cc66' : r.error ? '#ff6666' : '#ff6666',
                    cursor: r.available || r.error ? 'default' : 'pointer',
                    transition: '0.15s',
                  }}>
                  {r.domain}
                  {r.available ? ` — Available ${r.price ? `$${r.price}` : ''}` : r.error ? ` — ${r.error}` : ` — Taken (click to inspect)`}
                </span>
              ))}
            </div>

            {lookupLoading && lookedUpDomain && (
              <p style={{ color: '#666', fontSize: 13, marginTop: 10 }}>Looking up DNS records for {lookedUpDomain}...</p>
            )}

            {lookupRecords && lookedUpDomain && (
              <div style={{ marginTop: 12, background: '#0f0f0f', borderRadius: 8, border: '1px solid #2a2a2a', overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid #2a2a2a', color: '#a0a0a0', fontSize: 12, fontWeight: 600 }}>
                  Public DNS Records — {lookedUpDomain}
                </div>
                {lookupRecords.length === 0 ? (
                  <p style={{ padding: 16, color: '#666', fontSize: 13, margin: 0 }}>No public DNS records found</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                        <th style={{ padding: '6px 10px', textAlign: 'left', color: '#666', fontWeight: 500, width: 80 }}>Type</th>
                        <th style={{ padding: '6px 10px', textAlign: 'left', color: '#666', fontWeight: 500 }}>Name</th>
                        <th style={{ padding: '6px 10px', textAlign: 'left', color: '#666', fontWeight: 500 }}>Value</th>
                        <th style={{ padding: '6px 10px', textAlign: 'right', color: '#666', fontWeight: 500, width: 60 }}>TTL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lookupRecords.map((rec, j) => (
                        <tr key={j} style={{ borderBottom: j < lookupRecords.length - 1 ? '1px solid #2a2a2a' : 'none' }}>
                          <td style={{ padding: '6px 10px' }}><span style={{ color: '#00d4ff' }}>{rec.type}</span></td>
                          <td style={{ padding: '6px 10px', color: '#ccc' }}>{rec.name}</td>
                          <td style={{ padding: '6px 10px', color: '#ccc', wordBreak: 'break-all' }}>{rec.value}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', color: '#666' }}>{rec.ttl}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {!error && domains.length > 0 && (
        <div style={{ display: 'grid', gap: 12 }}>
          {domains.map(d => (
            <div key={d.name} style={{
              background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 16,
              cursor: 'pointer', transition: '0.15s',
            }} onClick={() => viewDetails(d)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>{d.isPremium ? '⭐' : '🌐'}</span>
                  <div>
                    <span style={{ fontWeight: 600, color: '#fff', fontSize: 15 }}>{d.name}</span>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      {d.isExpired && <span style={{ color: '#ff4444', fontSize: 12, background: '#ff444415', padding: '1px 6px', borderRadius: 4 }}>Expired</span>}
                      {d.isLocked && <span style={{ color: '#ffaa00', fontSize: 12, background: '#ffaa0015', padding: '1px 6px', borderRadius: 4 }}>Locked</span>}
                      {d.autoRenew && <span style={{ color: '#00cc66', fontSize: 12, background: '#00cc6615', padding: '1px 6px', borderRadius: 4 }}>Auto-Renew</span>}
                      {d.whoisGuard && <span style={{ color: '#00d4ff', fontSize: 12, background: '#00d4ff15', padding: '1px 6px', borderRadius: 4 }}>WhoisGuard</span>}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', color: '#a0a0a0', fontSize: 13 }}>
                  <div>Expires: {formatDate(d.expires)}</div>
                </div>
              </div>

              {selectedDomain?.name === d.name && (
                <div onClick={e => e.stopPropagation()} style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #2a2a2a' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13, color: '#a0a0a0', marginBottom: 16 }}>
                    <div>ID: <span style={{ color: '#fff' }}>{d.id}</span></div>
                    <div>Expires: <span style={{ color: '#fff' }}>{formatDate(d.expires)}</span></div>
                    <div>Locked: <span style={{ color: d.isLocked ? '#ffaa00' : '#00cc66' }}>{d.isLocked ? 'Yes' : 'No'}</span></div>
                    <div>Auto-Renew: <span style={{ color: d.autoRenew ? '#00cc66' : '#666' }}>{d.autoRenew ? 'On' : 'Off'}</span></div>
                    <div>WhoisGuard: <span style={{ color: d.whoisGuard ? '#00d4ff' : '#666' }}>{d.whoisGuard ? 'Enabled' : 'Disabled'}</span></div>
                    <div>Premium: <span style={{ color: d.isPremium ? '#ffaa00' : '#666' }}>{d.isPremium ? 'Yes' : 'No'}</span></div>
                  </div>

                  <div style={{ fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h3 style={{ margin: 0, fontSize: 15, color: '#fff' }}>DNS Records</h3>
                      {dnsInfo && (
                        <span style={{ color: '#666', fontSize: 12, background: '#0f0f0f', padding: '3px 10px', borderRadius: 6 }}>
                          {dnsInfo.isUsingOurDNS
                            ? 'Using Namecheap DNS'
                            : `Custom: ${(dnsInfo.nameservers || []).join(', ')}`}
                        </span>
                      )}
                    </div>

                    {dnsLoading && <p style={{ color: '#666', textAlign: 'center', padding: 20 }}>Loading DNS records...</p>}

                    {dnsError && (
                      <div style={{ background: '#ff444415', border: '1px solid #ff444433', borderRadius: 8, padding: 12, marginBottom: 12, color: '#ff6666' }}>
                        {dnsError}
                      </div>
                    )}

                    {dnsSuccess && (
                      <div style={{ background: '#00cc6615', border: '1px solid #00cc6644', borderRadius: 8, padding: 12, marginBottom: 12, color: '#00cc66' }}>
                        {dnsSuccess}
                      </div>
                    )}

                    {dnsRecords && !dnsLoading && (
                      <>
                        <div style={{ background: '#0f0f0f', borderRadius: 8, overflow: 'hidden', border: '1px solid #2a2a2a' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                              <tr style={{ background: '#1a1a1a', borderBottom: '1px solid #2a2a2a' }}>
                                <th style={{ padding: '8px 10px', textAlign: 'left', color: '#666', fontWeight: 500, width: 28 }}></th>
                                <th style={{ padding: '8px 10px', textAlign: 'left', color: '#666', fontWeight: 500 }}>Name</th>
                                <th style={{ padding: '8px 10px', textAlign: 'left', color: '#666', fontWeight: 500, width: 80 }}>Type</th>
                                <th style={{ padding: '8px 10px', textAlign: 'left', color: '#666', fontWeight: 500 }}>Value</th>
                                <th style={{ padding: '8px 10px', textAlign: 'left', color: '#666', fontWeight: 500, width: 60 }}>Priority</th>
                                <th style={{ padding: '8px 10px', textAlign: 'left', color: '#666', fontWeight: 500, width: 60 }}>TTL</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dnsRecords.map((r, i) => (
                                <tr key={i} style={{ borderBottom: i < dnsRecords.length - 1 ? '1px solid #2a2a2a' : 'none' }}>
                                  <td style={{ padding: '6px 8px' }}>
                                    <button onClick={e => { e.stopPropagation(); removeRecord(i); }}
                                      style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: 14, padding: 2 }}>
                                      ✕
                                    </button>
                                  </td>
                                  <td style={{ padding: '6px 8px' }}>
                                    <input value={r.name} onChange={e => updateRecord(i, 'name', e.target.value)}
                                      placeholder="@"
                                      style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid #2a2a2a', background: '#1a1a1a', color: '#fff', fontSize: 13, outline: 'none' }} />
                                  </td>
                                  <td style={{ padding: '6px 8px' }}>
                                    <select value={r.type} onChange={e => updateRecord(i, 'type', e.target.value)}
                                      style={{ width: '100%', padding: '6px 4px', borderRadius: 4, border: '1px solid #2a2a2a', background: '#1a1a1a', color: '#fff', fontSize: 13, outline: 'none' }}>
                                      {RECORD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                  </td>
                                  <td style={{ padding: '6px 8px' }}>
                                    <input value={r.address} onChange={e => updateRecord(i, 'address', e.target.value)}
                                      placeholder="e.g. 1.2.3.4"
                                      style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid #2a2a2a', background: '#1a1a1a', color: '#fff', fontSize: 13, outline: 'none' }} />
                                  </td>
                                  <td style={{ padding: '6px 8px' }}>
                                    <input value={r.mxPref} onChange={e => updateRecord(i, 'mxPref', parseInt(e.target.value) || 10)}
                                      type="number" min="0" max="999"
                                      style={{ width: '100%', padding: '6px 4px', borderRadius: 4, border: '1px solid #2a2a2a', background: '#1a1a1a', color: '#fff', fontSize: 13, outline: 'none', textAlign: 'center' }} />
                                  </td>
                                  <td style={{ padding: '6px 8px' }}>
                                    <input value={r.ttl} onChange={e => updateRecord(i, 'ttl', parseInt(e.target.value) || 1800)}
                                      type="number" min="60" max="86400" step="60"
                                      style={{ width: '100%', padding: '6px 4px', borderRadius: 4, border: '1px solid #2a2a2a', background: '#1a1a1a', color: '#fff', fontSize: 13, outline: 'none', textAlign: 'center' }} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                          <button onClick={e => { e.stopPropagation(); addRecord(); }} style={{
                            background: 'transparent', color: '#00d4ff', border: '1px solid #00d4ff44',
                            padding: '8px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13,
                          }}>
                            + Add Record
                          </button>
                          <button onClick={e => { e.stopPropagation(); saveDns(); }} disabled={dnsSaving} style={{
                            ...btnStyle, padding: '8px 20px', fontSize: 13,
                            opacity: dnsSaving ? 0.6 : 1,
                          }}>
                            {dnsSaving ? 'Saving...' : 'Save Changes'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!error && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{
            ...btnStyle, background: page <= 1 ? '#2a2a2a' : '#00d4ff',
            color: page <= 1 ? '#666' : '#000', cursor: page <= 1 ? 'default' : 'pointer',
          }}>← Prev</button>
          <span style={{ color: '#666', padding: '10px', fontSize: 14 }}>
            Page {page} of {totalPages}
          </span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{
            ...btnStyle, background: page >= totalPages ? '#2a2a2a' : '#00d4ff',
            color: page >= totalPages ? '#666' : '#000', cursor: page >= totalPages ? 'default' : 'pointer',
          }}>Next →</button>
        </div>
      )}

      {!error && !loading && domains.length === 0 && total === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
          <p style={{ fontSize: 16 }}>No domains found</p>
          <p style={{ fontSize: 13 }}>Click Refresh to load from Namecheap</p>
        </div>
      )}
    </div>
  )
}
