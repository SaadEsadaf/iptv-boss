import { useState, useEffect } from 'react'

export default function Tickets() {
  const [tickets, setTickets] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('')

  useEffect(() => { loadTickets() }, [])

  async function loadTickets() {
    const url = filter ? `/api/tickets?status=${filter}` : '/api/tickets'
    const res = await fetch(url).then(r => r.json())
    if (res?.tickets) setTickets(res.tickets)
  }

  async function openTicket(t) {
    setSelected(t)
    const res = await fetch(`/api/tickets/${t.id}`).then(r => r.json())
    if (res?.messages) setMessages(res.messages)
  }

  async function sendReply() {
    if (!reply.trim() || !selected) return
    setLoading(true)
    const res = await fetch(`/api/tickets/${selected.id}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: reply, author: 'Support', author_email: 'support@dalletek.live', is_admin: true }),
    })
    const data = await res.json()
    if (data.success) {
      setReply('')
      const updated = await fetch(`/api/tickets/${selected.id}`).then(r => r.json())
      if (updated?.messages) setMessages(updated.messages)
    }
    setLoading(false)
  }

  async function updateStatus(id, status) {
    await fetch(`/api/tickets/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    loadTickets()
    if (selected?.id === id) setSelected(s => ({ ...s, status }))
  }

  const colors = { open: '#00d4ff', pending: '#ffd700', resolved: '#00cc66', closed: '#666' }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>🎫 Support Tickets</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <select onChange={e => { setFilter(e.target.value); setSelected(null) }} value={filter} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #2a2a2a', background: '#1a1a1a', color: '#fff', fontSize: 13 }}>
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <button onClick={() => { loadTickets(); setSelected(null) }} style={{ padding: '6px 14px', background: '#00d4ff', color: '#000', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Refresh</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {tickets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#666' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎫</div>
              <p>No tickets yet</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: '#888', fontSize: 12 }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #1a1a1a' }}>Ref</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #1a1a1a' }}>Subject</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #1a1a1a' }}>Customer</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #1a1a1a' }}>Status</th>
                  <th style={{ textAlign: 'center', padding: '8px 12px', borderBottom: '1px solid #1a1a1a' }}>Msgs</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #1a1a1a' }}>Updated</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(t => (
                  <tr key={t.id} onClick={() => openTicket(t)} style={{ cursor: 'pointer', borderBottom: '1px solid #1a1a1a', background: selected?.id === t.id ? '#1a1a3e' : 'transparent' }}>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#888', fontFamily: 'monospace' }}>{t.ref_code || '#'+t.id}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13 }}>{t.subject}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12 }}>{t.customer_name || ''}<br /><span style={{ color: '#666', fontSize: 11 }}>{t.customer_email}</span></td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ background: (colors[t.status] || '#666') + '20', color: colors[t.status] || '#666', padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{t.status}</span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{t.msg_count}</td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#666' }}>{t.updated_at || t.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selected && (
          <div style={{ width: 420, flexShrink: 0, background: '#1a1a1a', borderRadius: 12, padding: 20, maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #2a2a2a' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 15 }}>{selected.subject}</h3>
                <p style={{ color: '#888', fontSize: 11, margin: 0 }}>{selected.customer_name || ''} &lt;{selected.customer_email}&gt; #{selected.ref_code}</p>
              </div>
              <select value={selected.status} onChange={e => updateStatus(selected.id, e.target.value)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #2a2a2a', background: '#0f0f0f', color: '#fff', fontSize: 11 }}>
                <option value="open">Open</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              {messages.map(m => (
                <div key={m.id} style={{ display: 'flex', marginBottom: 10, flexDirection: m.is_admin ? 'row-reverse' : 'row' }}>
                  <div style={{ maxWidth: '85%', background: m.is_admin ? '#00d4ff10' : '#0f0f0f', border: `1px solid ${m.is_admin ? '#00d4ff30' : '#2a2a2a'}`, borderRadius: 12, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, color: '#888', marginBottom: 4, textAlign: m.is_admin ? 'right' : 'left' }}>
                      <strong>{m.author}</strong> {m.is_admin ? '🛡️' : ''} • {m.created_at}
                    </div>
                    <div style={{ fontSize: 13, color: '#ccc', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{m.message}</div>
                  </div>
                </div>
              ))}
            </div>

            {selected.status !== 'closed' && (
              <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: 12 }}>
                <textarea value={reply} onChange={e => setReply(e.target.value)} rows={3} placeholder="Type your reply..." style={{ width: '100%', padding: '10px 12px', background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff', fontSize: 13, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                <button onClick={sendReply} disabled={loading || !reply.trim()} style={{ marginTop: 8, width: '100%', padding: '10px', background: '#00d4ff', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13, opacity: loading || !reply.trim() ? 0.6 : 1 }}>
                  {loading ? 'Sending...' : '📤 Send Reply'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
