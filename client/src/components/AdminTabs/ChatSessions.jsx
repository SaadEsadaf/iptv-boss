import { useState, useEffect } from 'react'
import api from '../../api'

export default function ChatSessions() {
  const [sessions, setSessions] = useState([])
  const [selected, setSelected] = useState(null)
  const [stats, setStats] = useState({ today: 0, total: 0, conversionRate: 0 })

  useEffect(() => {
    api.get('/admin/chat/sessions').then(r => setSessions(r.data)).catch(() => {})
    api.get('/admin/overview').then(r => setStats(r.data.chat)).catch(() => {})
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {[
          ['Today', stats.today],
          ['Total', stats.total],
          ['Conversion', `${stats.conversionRate || 0}%`],
        ].map(([l, v]) => (
          <div key={l} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '12px 20px', textAlign: 'center' }}>
            <p style={{ color: '#666', fontSize: 12, margin: '0 0 4px' }}>{l}</p>
            <p style={{ color: '#00d4ff', fontSize: 22, fontWeight: 700, margin: 0 }}>{v}</p>
          </div>
        ))}
      </div>

      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #2a2a2a', color: '#666' }}>
              <th style={thStyle}>Session ID</th>
              <th style={thStyle}>Messages</th>
              <th style={thStyle}>Converted</th>
              <th style={thStyle}>Started</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map(s => (
              <tr key={s.id} onClick={() => setSelected(s)} style={{ borderBottom: '1px solid #2a2a2a', cursor: 'pointer' }}>
                <td style={{ ...tdStyle, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#666' }}>{s.id.slice(0, 16)}...</td>
                <td style={tdStyle}>{(s.messages || []).length}</td>
                <td style={tdStyle}><span style={{ color: s.converted ? '#00cc66' : '#666', fontWeight: 600 }}>{s.converted ? '✅ Yes' : 'No'}</span></td>
                <td style={{ ...tdStyle, color: '#666' }}>{s.started_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sessions.length === 0 && <p style={{ textAlign: 'center', color: '#666', padding: 40 }}>No sessions found</p>}
      </div>

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'flex-end', zIndex: 100 }}>
          <div style={{ width: 480, background: '#1a1a1a', borderLeft: '1px solid #2a2a2a', padding: 24, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Chat Session</h2>
              <button onClick={() => setSelected(null)} style={{ background: 'transparent', border: 'none', color: '#a0a0a0', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            <div style={{ marginBottom: 16, display: 'flex', gap: 16, fontSize: 13, color: '#666' }}>
              <span>Converted: <strong style={{ color: selected.converted ? '#00cc66' : '#666' }}>{selected.converted ? 'Yes' : 'No'}</strong></span>
              <span>Messages: <strong>{selected.messages?.length || 0}</strong></span>
            </div>
            <div style={{ background: '#0f0f0f', borderRadius: 8, padding: 12, maxHeight: 500, overflowY: 'auto' }}>
              {(selected.messages || []).map((m, i) => (
                <div key={i} style={{ marginBottom: 8, padding: '8px 12px', background: m.role === 'user' ? '#00d4ff' : '#2a2a2a', borderRadius: 8, color: m.role === 'user' ? '#000' : '#fff', fontSize: 13 }}>
                  <strong>{m.role === 'user' ? 'Visitor' : 'Alex'}:</strong>
                  <div style={{ marginTop: 4 }}>{m.text}</div>
                  <div style={{ color: '#666', fontSize: 11, marginTop: 4 }}>{m.timestamp}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const thStyle = { textAlign: 'left', padding: '10px 14px', fontWeight: 500 }
const tdStyle = { padding: '10px 14px' }
