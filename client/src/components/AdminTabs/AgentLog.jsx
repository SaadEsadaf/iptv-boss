import { useState, useEffect } from 'react'
import api from '../../api'

export default function AgentLog() {
  const [logs, setLogs] = useState([])
  const [filter, setFilter] = useState('')

  function load() {
    const params = new URLSearchParams()
    if (filter) params.set('agent', filter)
    api.get(`/admin/agent-log?${params}`).then(r => setLogs(r.data)).catch(() => {})
  }

  useEffect(load, [filter])

  useEffect(() => {
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [filter])

  const agents = [...new Set(logs.map(l => l.agent))]

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <label style={{ color: '#666', fontSize: 13 }}>Agent filter:</label>
        <select value={filter} onChange={e => setFilter(e.target.value)} style={selectStyle}>
          <option value="">All</option>
          {agents.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <span style={{ color: '#666', fontSize: 13 }}>(auto-refreshes every 30s)</span>
      </div>

      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #2a2a2a', color: '#666' }}>
              <th style={thStyle}>Agent</th>
              <th style={thStyle}>Action</th>
              <th style={thStyle}>Details</th>
              <th style={thStyle}>Order ID</th>
              <th style={thStyle}>Time</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                <td style={{ ...tdStyle, color: '#00d4ff', fontWeight: 600 }}>{l.agent}</td>
                <td style={tdStyle}>{l.action}</td>
                <td style={{ ...tdStyle, color: '#a0a0a0', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.details}</td>
                <td style={{ ...tdStyle, color: '#666' }}>{l.order_id ? `#${l.order_id}` : '-'}</td>
                <td style={{ ...tdStyle, color: '#666', whiteSpace: 'nowrap' }}>{l.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <p style={{ textAlign: 'center', color: '#666', padding: 40 }}>No log entries</p>}
      </div>
    </div>
  )
}

const selectStyle = { padding: '8px 12px', borderRadius: 8, border: '1px solid #2a2a2a', background: '#0f0f0f', color: '#fff', fontSize: 13, outline: 'none' }
const thStyle = { textAlign: 'left', padding: '10px 14px', fontWeight: 500 }
const tdStyle = { padding: '10px 14px' }
