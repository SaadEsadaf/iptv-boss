import { useState, useEffect } from 'react'
import api from '../../api'

export default function BrainHub() {
  const [metrics, setMetrics] = useState(null)
  const [decisions, setDecisions] = useState([])
  const [alerts, setAlerts] = useState([])
  const [running, setRunning] = useState(false)
  const [lastRun, setLastRun] = useState(null)

  function load() {
    api.get('/admin/brain/status').then(r => {
      setMetrics(r.data.metrics)
      setDecisions(r.data.decisions || [])
      setAlerts(r.data.alerts || [])
    }).catch(() => {})
  }

  useEffect(load, [])

  async function runCycle() {
    setRunning(true)
    try {
      const res = await api.post('/admin/brain/run-cycle')
      setLastRun(res.data)
      load()
    } catch (e) {
      alert('Brain cycle failed: ' + (e.response?.data?.error || e.message))
    } finally {
      setRunning(false)
    }
  }

  const MetricCard = ({ label, value, color, sub }) => (
    <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: '16px', flex: 1, minWidth: 140 }}>
      <div style={{ color: '#666', fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || '#00d4ff' }}>{value}</div>
      {sub && <div style={{ color: '#666', fontSize: 11, marginTop: 2 }}>{sub}</div>}
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>🧠 Brain Engine</h2>
          <p style={{ color: '#666', margin: '4px 0 0', fontSize: 13 }}>Automated learning, alerts, and decision engine</p>
        </div>
        <button onClick={runCycle} disabled={running} style={{
          padding: '10px 24px', background: running ? '#2a2a2a' : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
          color: running ? '#666' : '#fff', border: 'none', borderRadius: 8, fontWeight: 700,
          cursor: running ? 'default' : 'pointer', fontSize: 14,
        }}>
          {running ? '⚡ Running...' : '▶ Run Brain Cycle'}
        </button>
      </div>

      {lastRun && (
        <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', gap: 20, fontSize: 13 }}>
          <span style={{ color: '#666' }}>Last run: <strong style={{ color: '#8b5cf6' }}>{lastRun.elapsed_ms}ms</strong></span>
          <span style={{ color: '#666' }}>Alerts: <strong style={{ color: lastRun.alerts > 0 ? '#ffaa00' : '#00cc66' }}>{lastRun.alerts}</strong></span>
          <span style={{ color: '#666' }}>Decisions: <strong style={{ color: '#00d4ff' }}>{lastRun.decisions}</strong></span>
        </div>
      )}

      {/* Funnel Metrics */}
      <h3 style={{ fontSize: 14, color: '#a0a0a0', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1 }}>📊 Funnel Overview</h3>
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <MetricCard label="Orders (24h)" value={metrics?.orders?.last24h?.count || 0} color="#00d4ff" sub={`€${metrics?.orders?.last24h?.revenue?.toFixed(2) || '0'}`} />
        <MetricCard label="Revenue (30d)" value={`€${(metrics?.revenue?.total || 0).toFixed(0)}`} color="#ffd700" sub={`${metrics?.orders?.last30d?.count || 0} orders`} />
        <MetricCard label="Trial→Paid" value={`${metrics?.conversion?.trial_to_paid_pct || 0}%`} color={ (metrics?.conversion?.trial_to_paid_pct || 0) >= 30 ? '#00cc66' : '#ffaa00' } sub={`${metrics?.conversion?.paid_after_trial || 0}/${metrics?.conversion?.trials_claimed || 0}`} />
        <MetricCard label="Trial Codes" value={metrics?.trials?.available || 0} color={(metrics?.trials?.available || 0) < 5 ? '#ff4444' : '#00cc66'} sub={`${metrics?.trials?.used || 0} used`} />
        <MetricCard label="Activation Codes" value={metrics?.codes?.available || 0} color="#00d4ff" sub={`${metrics?.codes?.total || 0} total`} />
        <MetricCard label="Leads (24h)" value={metrics?.leads?.last24h || 0} color="#8b5cf6" sub={`avg intent: ${metrics?.leads?.avgIntent || 0}`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Active Alerts */}
        <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, color: '#a0a0a0' }}>⚠️ Active Alerts ({alerts.length})</h3>
          {alerts.length === 0 ? (
            <p style={{ color: '#00cc66', fontSize: 13, textAlign: 'center', padding: 20 }}>✅ No active alerts</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {alerts.map(a => (
                <div key={a.id} style={{ background: '#0f0f0f', borderRadius: 8, padding: '10px 14px', fontSize: 13, borderLeft: '3px solid ' + (a.type?.includes('critical') || a.type?.includes('stockout') ? '#ff4444' : a.type?.includes('pending') ? '#ffaa00' : '#00d4ff') }}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{a.title}</div>
                  <div style={{ color: '#a0a0a0', fontSize: 12 }}>{a.message}</div>
                  {a.created_at && <div style={{ color: '#666', fontSize: 11, marginTop: 4 }}>{a.created_at.slice(0, 19)}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Decisions */}
        <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, color: '#a0a0a0' }}>🧠 Recent Decisions</h3>
          {decisions.length === 0 ? (
            <p style={{ color: '#666', fontSize: 13, textAlign: 'center', padding: 20 }}>No decisions yet. Run a brain cycle.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {decisions.slice(0, 10).map((d, i) => (
                <div key={d.id || i} style={{ background: '#0f0f0f', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontWeight: 600 }}>{d.type?.replace(/_/g, ' ')}</span>
                    <span style={{ color: '#8b5cf6', fontSize: 11, fontWeight: 600 }}>{(d.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div style={{ color: '#a0a0a0', fontSize: 12 }}>{d.decision || d.title}</div>
                  {d.created_at && <div style={{ color: '#666', fontSize: 11, marginTop: 4 }}>{d.created_at.slice(0, 19)}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}