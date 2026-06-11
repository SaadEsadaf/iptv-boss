import { useState, useEffect } from 'react'
import api from '../../api'

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [selected, setSelected] = useState(null)
  const [filters, setFilters] = useState({ status: '', search: '' })
  const [fulfilling, setFulfilling] = useState(null)
  const [availableCodes, setAvailableCodes] = useState({ activationCodes: [], trialCodes: [] })
  const [selectedCodeId, setSelectedCodeId] = useState(null)
  const [loading, setLoading] = useState(false)

  function load() {
    const params = new URLSearchParams()
    if (filters.status) params.set('status', filters.status)
    if (filters.search) params.set('search', filters.search)
    api.get(`/admin/orders?${params}`).then(r => setOrders(r.data)).catch(() => {})
  }

  useEffect(load, [filters])

  function openOrder(id) {
    api.get(`/admin/orders/${id}`).then(r => setSelected(r.data)).catch(() => {})
  }

  function resendEmail(id) {
    api.post(`/admin/orders/${id}/resend-email`).then(() => alert('Email resent!'))
  }

  function refundOrder(id) {
    if (!confirm('Refund this order?')) return
    api.post(`/admin/orders/${id}/refund`).then(() => { load(); setSelected(null) })
  }

  function openFulfill(order) {
    setFulfilling(order)
    setSelectedCodeId(null)
    api.get(`/admin/orders/${order.id}/available-codes`).then(r => {
      setAvailableCodes(r.data)
      if (r.data.activationCodes?.length > 0) setSelectedCodeId(r.data.activationCodes[0].id)
      else if (r.data.trialCodes?.length > 0) setSelectedCodeId(r.data.trialCodes[0].id)
    }).catch(() => {})
  }

  async function doFulfill() {
    if (!fulfilling || !selectedCodeId) return
    setLoading(true)
    const codeType = availableCodes.activationCodes.some(c => c.id === selectedCodeId) ? 'activation' : 'trial'
    try {
      const res = await api.post(`/admin/orders/${fulfilling.id}/fulfill`, { codeId: selectedCodeId, codeType })
      if (res.data.success) { alert('✅ Order fulfilled! Credentials sent.'); setFulfilling(null); load() }
      else alert(res.data.error || 'Fulfill failed')
    } catch (e) { alert(e.response?.data?.error || 'Request failed') }
    finally { setLoading(false) }
  }

  const statusColors = { pending: '#ffaa00', completed: '#00cc66', refunded: '#ff4444', failed: '#ff4444' }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} style={selectStyle}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="refunded">Refunded</option>
          <option value="failed">Failed</option>
        </select>
        <input placeholder="Search name or email..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} style={{ ...inputStyle, maxWidth: 250 }} />
      </div>

      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #2a2a2a', color: '#666' }}>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Customer</th>
              <th style={thStyle}>Provider / Plan</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>Status / Trial</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                <td style={{ ...tdStyle, color: '#666', fontFamily: 'monospace', cursor: 'pointer' }} onClick={() => openOrder(o.id)}>#{o.id}</td>
                <td style={tdStyle} onClick={() => openOrder(o.id)}>
                  <div>{o.customer_name || 'N/A'}</div>
                  <div style={{ color: '#666', fontSize: 12 }}>{o.customer_email}</div>
                </td>
                <td style={tdStyle} onClick={() => openOrder(o.id)}>
                  <div>{o.provider_name || '-'}</div>
                  <div style={{ color: '#666', fontSize: 12 }}>{o.plan_name || '-'}</div>
                </td>
                <td style={tdStyle} onClick={() => openOrder(o.id)}>{o.amount ? `$${o.amount?.toFixed(2)}` : '-'}</td>
                <td style={tdStyle} onClick={() => openOrder(o.id)}>
                  <span style={{ color: statusColors[o.status] || '#fff', fontWeight: 600, fontSize: 12 }}>{o.status}</span>
                  {o.is_trial ? <span style={{ marginLeft: 6, color: '#00d4ff', fontSize: 11 }}>🧪</span> : null}
                  {o.credentials_sent_at ? <span style={{ marginLeft: 4, color: '#00cc66', fontSize: 11 }}>📨</span> : null}
                </td>
                <td style={{ ...tdStyle, color: '#666' }} onClick={() => openOrder(o.id)}>{o.created_at?.slice(0, 10)}</td>
                <td style={tdStyle}>
                  {(o.status === 'pending' || (o.status === 'completed' && !o.credentials_sent_at)) && (
                    <button onClick={() => openFulfill(o)}
                      style={{ padding: '5px 12px', background: '#00cc66', color: '#000', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 11, whiteSpace: 'nowrap' }}>
                      🚀 Fulfill
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <p style={{ textAlign: 'center', color: '#666', padding: 40 }}>No orders found</p>}
      </div>

      {/* Fulfill Modal */}
      {fulfilling && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 16, padding: 24, maxWidth: 520, width: '90%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Fulfill Order #{fulfilling.id}</h2>
              <button onClick={() => setFulfilling(null)} style={{ background: 'transparent', border: 'none', color: '#a0a0a0', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>

            <div style={{ background: '#0f0f0f', borderRadius: 10, padding: 16, marginBottom: 16, fontSize: 13 }}>
              <div style={{ display: 'grid', gap: 6, gridTemplateColumns: '1fr 1fr' }}>
                <span style={{ color: '#666' }}>Customer:</span><span style={{ color: '#fff' }}>{fulfilling.customer_name || 'N/A'}</span>
                <span style={{ color: '#666' }}>Email:</span><span style={{ color: '#00d4ff' }}>{fulfilling.customer_email}</span>
                <span style={{ color: '#666' }}>Provider:</span><span>{fulfilling.provider_name || '-'}</span>
                <span style={{ color: '#666' }}>Plan:</span><span>{fulfilling.plan_name || '-'}</span>
                <span style={{ color: '#666' }}>Amount:</span><span style={{ color: '#ffd700' }}>{fulfilling.amount ? `$${fulfilling.amount.toFixed(2)}` : '-'}</span>
                <span style={{ color: '#666' }}>Source:</span><span>{fulfilling.source || '-'}</span>
              </div>
            </div>

            <h3 style={{ fontSize: 14, color: '#a0a0a0', margin: '0 0 10px' }}>Available Codes</h3>

            {availableCodes.activationCodes?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: '#00d4ff', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Activation Codes ({availableCodes.activationCodes.length} available)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {availableCodes.activationCodes.map(c => (
                    <button key={c.id} onClick={() => setSelectedCodeId(c.id)} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                      background: selectedCodeId === c.id ? '#00d4ff20' : '#0f0f0f',
                      border: selectedCodeId === c.id ? '1.5px solid #00d4ff' : '1px solid #2a2a2a',
                      borderRadius: 8, cursor: 'pointer', color: '#fff', fontSize: 13, textAlign: 'left',
                    }}>
                      <input type="radio" checked={selectedCodeId === c.id} readOnly style={{ accentColor: '#00d4ff' }} />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontFamily: 'monospace', color: '#ffd700' }}>{c.code}</span>
                        {c.username && <span style={{ color: '#666', marginLeft: 8, fontSize: 11 }}>{c.username}</span>}
                      </div>
                      <span style={{ color: '#666', fontSize: 11 }}>{c.plan_name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {availableCodes.trialCodes?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: '#ffaa00', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Trial Codes ({availableCodes.trialCodes.length} available)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {availableCodes.trialCodes.map(c => (
                    <button key={c.id} onClick={() => setSelectedCodeId(c.id)} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                      background: selectedCodeId === c.id ? '#ffaa0020' : '#0f0f0f',
                      border: selectedCodeId === c.id ? '1.5px solid #ffaa00' : '1px solid #2a2a2a',
                      borderRadius: 8, cursor: 'pointer', color: '#fff', fontSize: 13, textAlign: 'left',
                    }}>
                      <input type="radio" checked={selectedCodeId === c.id} readOnly style={{ accentColor: '#ffaa00' }} />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontFamily: 'monospace' }}>{c.code}</span>
                        <span style={{ color: '#666', marginLeft: 8, fontSize: 11 }}>{c.duration_hours}h trial</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!availableCodes.activationCodes?.length && !availableCodes.trialCodes?.length && (
              <p style={{ color: '#ff4444', fontSize: 13, textAlign: 'center', padding: 20 }}>No codes available for this provider/plan.</p>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={doFulfill} disabled={!selectedCodeId || loading} style={{
                flex: 1, padding: '12px', background: selectedCodeId && !loading ? '#00cc66' : '#2a2a2a',
                color: selectedCodeId && !loading ? '#000' : '#666', border: 'none', borderRadius: 8,
                fontWeight: 700, cursor: selectedCodeId && !loading ? 'pointer' : 'default', fontSize: 14,
              }}>
                {loading ? 'Sending...' : '✅ Assign Code & Send Credentials'}
              </button>
              <button onClick={() => setFulfilling(null)} style={{
                padding: '12px 20px', background: 'transparent', border: '1px solid #2a2a2a',
                borderRadius: 8, color: '#a0a0a0', cursor: 'pointer', fontSize: 14,
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Slide */}
      {selected && !fulfilling && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'flex-end', zIndex: 100 }}>
          <div style={{ width: 480, background: '#1a1a1a', borderLeft: '1px solid #2a2a2a', padding: 24, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Order #{selected.id}</h2>
              <button onClick={() => setSelected(null)} style={{ background: 'transparent', border: 'none', color: '#a0a0a0', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            <div style={{ display: 'grid', gap: 8, marginBottom: 24 }}>
              {[
                ['Customer', selected.customer_name || 'N/A'],
                ['Email', selected.customer_email],
                ['Phone', selected.customer_phone || '-'],
                ['Country', selected.customer_country || '-'],
                ['Provider', selected.provider_name || '-'],
                ['Plan', selected.plan_name || '-'],
                ['Amount', selected.amount ? `$${selected.amount.toFixed(2)}` : '-'],
                ['Status', selected.status],
                ['Trial', selected.is_trial ? 'Yes' : 'No'],
                ['Source', selected.source || '-'],
                ['App', selected.preferred_app || '-'],
                ['Created', selected.created_at],
                ['Credentials Sent', selected.credentials_sent_at || 'No'],
                ['Payment Confirmed', selected.payment_confirmed_at || 'No'],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #2a2a2a' }}>
                  <span style={{ color: '#666', fontSize: 13 }}>{l}</span>
                  <span style={{ fontSize: 13 }}>{v}</span>
                </div>
              ))}
            </div>

            {selected.chat_session && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 16, margin: '0 0 12px' }}>Chat Transcript</h3>
                <div style={{ maxHeight: 300, overflowY: 'auto', background: '#0f0f0f', borderRadius: 8, padding: 12 }}>
                  {(selected.chat_session.messages || []).map((m, i) => (
                    <div key={i} style={{ marginBottom: 8, padding: '6px 10px', background: m.role === 'user' ? '#00d4ff' : '#2a2a2a', borderRadius: 8, color: m.role === 'user' ? '#000' : '#fff', fontSize: 13 }}>
                      <strong>{m.role === 'user' ? 'Visitor' : 'Alex'}:</strong> {m.text}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              {(selected.status === 'pending' || (selected.status === 'completed' && !selected.credentials_sent_at)) && (
                <button onClick={() => { openFulfill(selected); setSelected(null) }} style={{ flex: 1, padding: '10px', background: '#00cc66', color: '#000', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                  🚀 Fulfill
                </button>
              )}
              <button onClick={() => resendEmail(selected.id)} style={{ flex: 1, padding: '10px', background: '#00d4ff', color: '#000', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                Resend Email
              </button>
              <button onClick={() => refundOrder(selected.id)} style={{ flex: 1, padding: '10px', background: '#ff4444', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const selectStyle = { padding: '8px 12px', borderRadius: 8, border: '1px solid #2a2a2a', background: '#0f0f0f', color: '#fff', fontSize: 13, outline: 'none' }
const inputStyle = { padding: '8px 12px', borderRadius: 8, border: '1px solid #2a2a2a', background: '#0f0f0f', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
const thStyle = { textAlign: 'left', padding: '10px 14px', fontWeight: 500 }
const tdStyle = { padding: '10px 14px' }