import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import api from '../../api'

const COLORS = ['#00d4ff', '#00cc66', '#ffaa00', '#ff66cc', '#ff4444', '#aa66ff']

export default function Overview() {
  const [data, setData] = useState(null)

  useEffect(() => {
    api.get('/admin/overview').then(r => setData(r.data)).catch(() => {})
    const interval = setInterval(() => {
      api.get('/admin/overview').then(r => setData(r.data)).catch(() => {})
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  if (!data) return <p style={{ color: '#666' }}>Loading...</p>

  const { revenue, orders, codes, trials, chat, revenueByDay, ordersByPlan } = data

  const chartData = revenueByDay.map(d => ({
    date: d.day?.slice(5) || '',
    revenue: d.revenue,
  }))

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Revenue Today', value: `$${revenue.today.toFixed(2)}`, color: '#00d4ff' },
          { label: 'Revenue Week', value: `$${revenue.week.toFixed(2)}`, color: '#00d4ff' },
          { label: 'Revenue Month', value: `$${revenue.month.toFixed(2)}`, color: '#00d4ff' },
          { label: 'Total Revenue', value: `$${revenue.total.toFixed(2)}`, color: '#00d4ff' },
          { label: 'Codes Available', value: codes.available, color: '#00cc66' },
          { label: 'Trials Available', value: trials.available, color: '#ffaa00' },
          { label: 'Chats Today', value: chat.today, color: '#00d4ff' },
          { label: 'Conversion Rate', value: `${chat.conversionRate}%`, color: '#ff66cc' },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 20 }}>
            <p style={{ color: '#666', fontSize: 13, margin: '0 0 8px' }}>{kpi.label}</p>
            <p style={{ color: kpi.color, fontSize: 28, fontWeight: 700, margin: 0 }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Revenue (30 days)</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <XAxis dataKey="date" stroke="#666" tick={{ fontSize: 11 }} />
                <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff' }} />
                <Line type="monotone" dataKey="revenue" stroke="#00d4ff" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p style={{ color: '#666', fontSize: 14 }}>No revenue data yet</p>}
        </div>
        <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Orders by Plan</h3>
          {ordersByPlan.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={ordersByPlan} dataKey="count" nameKey="plan_name" cx="50%" cy="50%" outerRadius={80} label={({ plan_name, count }) => `${plan_name} (${count})`}>
                  {ordersByPlan.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p style={{ color: '#666', fontSize: 14 }}>No orders yet</p>}
        </div>
      </div>

      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Provider Stock</h3>
        <div style={{ display: 'grid', gap: 8 }}>
          {data.providers.map(p => {
            const ratio = p.codes_total ? p.codes_available / p.codes_total : 0
            const color = ratio > 0.3 ? '#00cc66' : ratio > 0.1 ? '#ffaa00' : '#ff4444'
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: '#0f0f0f', borderRadius: 8 }}>
                <span style={{ flex: 1, color: '#fff' }}>{p.name}</span>
                <span style={{ color: '#666', fontSize: 13 }}>Codes:</span>
                <span style={{ color, fontWeight: 600 }}>{p.codes_available}/{p.codes_total}</span>
                <span style={{ color: '#666', fontSize: 13 }}>Trials:</span>
                <span style={{ color: '#ffaa00', fontWeight: 600 }}>{p.trials_available}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Recent Activity</h3>
        {data.recentActivity.length > 0 ? data.recentActivity.map(a => (
          <div key={a.id} style={{ padding: '8px 0', borderBottom: '1px solid #2a2a2a', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
            <span><strong style={{ color: '#00d4ff' }}>{a.agent}</strong> — {a.action}: {a.details?.slice(0, 80)}</span>
            <span style={{ color: '#666', whiteSpace: 'nowrap', marginLeft: 12 }}>{a.created_at}</span>
          </div>
        )) : <p style={{ color: '#666', fontSize: 14 }}>No activity yet</p>}
      </div>
    </div>
  )
}
