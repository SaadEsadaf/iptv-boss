import { useState, useEffect } from 'react'
import api from '../../api'

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [selected, setSelected] = useState(null)
  const [filters, setFilters] = useState({ status: '', search: '' })

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

  const statusColors = { pending: '#ffaa00', completed: '#00cc66', refunded: '#ff4444' }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} style={selectStyle}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="refunded">Refunded</option>
        </select>
        <input placeholder="Search name or email..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} style={{ ...inputStyle, maxWidth: 250 }} />
      </div>

      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #2a2a2a', color: '#666' }}>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Customer</th>
              <th style={thStyle}>Provider</th>
              <th style={thStyle}>Plan</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} onClick={() => openOrder(o.id)} style={{ borderBottom: '1px solid #2a2a2a', cursor: 'pointer' }}>
                <td style={{ ...tdStyle, color: '#666', fontFamily: 'JetBrains Mono, monospace' }}>#{o.id}</td>
                <td style={tdStyle}>
                  <div>{o.customer_name || 'N/A'}</div>
                  <div style={{ color: '#666', fontSize: 12 }}>{o.customer_email}</div>
                </td>
                <td style={tdStyle}>{o.provider_name || '-'}</td>
                <td style={tdStyle}>{o.plan_name || '-'}</td>
                <td style={tdStyle}>{o.amount ? `$${o.amount.toFixed(2)}` : '-'}</td>
                <td style={tdStyle}><span style={{ color: statusColors[o.status] || '#fff', fontWeight: 600 }}>{o.status}</span></td>
                <td style={{ ...tdStyle, color: '#666' }}>{o.created_at?.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <p style={{ textAlign: 'center', color: '#666', padding: 40 }}>No orders found</p>}
      </div>

      {selected && (
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
                ['Created', selected.created_at],
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
