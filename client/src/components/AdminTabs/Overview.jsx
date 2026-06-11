import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import api from '../../api'

const COLORS = ['#00d4ff', '#00cc66', '#ffaa00', '#ff66cc', '#ff4444', '#aa66ff']

export default function Overview() {
  const [data, setData] = useState(null)
  const [health, setHealth] = useState(null)
  const [feed, setFeed] = useState(null)
  const [deliveries, setDeliveries] = useState(null)
  const [tab, setTab] = useState('overview')

  function load() {
    api.get('/admin/overview').then(r => setData(r.data)).catch(() => {})
    api.get('/admin/health').then(r => setHealth(r.data)).catch(() => {})
    api.get('/admin/feed-stock').then(r => setFeed(r.data)).catch(() => {})
    api.get('/admin/deliveries?limit=10').then(r => setDeliveries(r.data)).catch(() => {})
  }

  useEffect(() => { load(); const i = setInterval(load, 15000); return () => clearInterval(i) }, [])

  if (!data || !health || !feed || !deliveries) return <p style={{ color: '#666', padding: 20 }}>Chargement...</p>

  const { revenue, orders, codes, trials, chat, revenueByDay, ordersByPlan, providers } = data

  const chartData = revenueByDay.map(d => ({ date: d.day?.slice(5) || '', revenue: d.revenue }))

  const tabs = [
    { key: 'overview', label: '📊 Vue d\'ensemble' },
    { key: 'health', label: '❤️ Santé système' },
    { key: 'feed', label: '📦 Mon stock' },
    { key: 'deliveries', label: '📨 Livraisons' },
  ]

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: '8px 18px', borderRadius: 8, border: tab === t.key ? '1px solid #00d4ff' : '1px solid #2a2a2a',
              background: tab === t.key ? '#00d4ff15' : 'transparent', color: tab === t.key ? '#00d4ff' : '#888',
              cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* TAB: Overview */}
      {tab === 'overview' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Revenus Aujourd\'hui', value: `€${revenue.today.toFixed(2)}`, color: '#00d4ff' },
              { label: 'Revenus 7 jours', value: `€${revenue.week.toFixed(2)}`, color: '#00d4ff' },
              { label: 'Revenus 30 jours', value: `€${revenue.month.toFixed(2)}`, color: '#00d4ff' },
              { label: 'Revenus Total', value: `€${revenue.total.toFixed(2)}`, color: '#00d4ff' },
              { label: 'Codes dispo', value: codes.available, color: '#00cc66' },
              { label: 'Essais dispo', value: trials.available, color: '#ffaa00' },
              { label: 'Commandes jour', value: orders.today, color: '#00d4ff' },
              { label: 'Taux conversion', value: `${chat.conversionRate}%`, color: '#ff66cc' },
            ].map(kpi => (
              <div key={kpi.label} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 16 }}>
                <p style={{ color: '#666', fontSize: 12, margin: '0 0 6px' }}>{kpi.label}</p>
                <p style={{ color: kpi.color, fontSize: 24, fontWeight: 700, margin: 0 }}>{kpi.value}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>Revenus (30 jours)</h3>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <XAxis dataKey="date" stroke="#666" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff' }} />
                    <Line type="monotone" dataKey="revenue" stroke="#00d4ff" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <p style={{ color: '#666', fontSize: 13 }}>Aucune donnée</p>}
            </div>
            <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>Commandes par offre</h3>
              {ordersByPlan.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={ordersByPlan} dataKey="count" nameKey="plan_name" cx="50%" cy="50%" outerRadius={80} label={({ plan_name, count }) => `${plan_name} (${count})`}>
                      {ordersByPlan.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p style={{ color: '#666', fontSize: 13 }}>Aucune commande</p>}
            </div>
          </div>

          <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>Stock par fournisseur</h3>
            {providers.map(p => {
              const ratio = p.codes_total ? p.codes_available / p.codes_total : 0
              const color = ratio > 0.3 ? '#00cc66' : ratio > 0.1 ? '#ffaa00' : '#ff4444'
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: '#0f0f0f', borderRadius: 8, marginBottom: 6 }}>
                  <span style={{ flex: 1, color: '#fff', fontWeight: 600 }}>{p.name}</span>
                  <span style={{ color: '#666', fontSize: 12 }}>Codes:</span>
                  <span style={{ color, fontWeight: 600 }}>{p.codes_available}/{p.codes_total}</span>
                  <span style={{ color: '#666', fontSize: 12 }}>Essais:</span>
                  <span style={{ color: '#ffaa00', fontWeight: 600 }}>{p.trials_available}</span>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* TAB: Health */}
      {tab === 'health' && (
        <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, color: '#00d4ff' }}>❤️ Santé du système Atlas</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {health.checks.map((c, i) => {
              const dotColor = c.status === 'ok' ? '#00cc66' : c.status === 'warning' ? '#ffaa00' : '#ff4444'
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#0f0f0f', borderRadius: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                  <span style={{ flex: 1, color: '#fff', fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                  <span style={{ color: c.status === 'ok' ? '#00cc66' : c.status === 'warning' ? '#ffaa00' : '#ff4444', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>{c.status}</span>
                  <span style={{ color: '#888', fontSize: 11, maxWidth: 300, textAlign: 'right' }}>{c.detail}</span>
                </div>
              )
            })}
          </div>
          <p style={{ color: '#666', fontSize: 11, marginTop: 16, textAlign: 'right' }}>Dernière vérification: {new Date(health.timestamp).toLocaleString()}</p>
        </div>
      )}

      {/* TAB: Feed Stock (You = feeder) */}
      {tab === 'feed' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 24 }}>
            <div style={{ background: '#1a1a1a', border: '1px solid #00d4ff44', borderRadius: 12, padding: 20 }}>
              <p style={{ color: '#888', fontSize: 12, margin: '0 0 6px' }}>Codes importés (total)</p>
              <p style={{ color: '#00d4ff', fontSize: 28, fontWeight: 700, margin: 0 }}>{feed.codesImported}</p>
            </div>
            <div style={{ background: '#1a1a1a', border: '1px solid #00cc6644', borderRadius: 12, padding: 20 }}>
              <p style={{ color: '#888', fontSize: 12, margin: '0 0 6px' }}>Essais gratuits restants</p>
              <p style={{ color: '#00cc66', fontSize: 28, fontWeight: 700, margin: 0 }}>{feed.trials.freeRemaining}/30</p>
            </div>
            <div style={{ background: '#1a1a1a', border: '1px solid #ffaa0044', borderRadius: 12, padding: 20 }}>
              <p style={{ color: '#888', fontSize: 12, margin: '0 0 6px' }}>Essais utilisés</p>
              <p style={{ color: '#ffaa00', fontSize: 28, fontWeight: 700, margin: 0 }}>{feed.trials.freeUsed}</p>
            </div>
            <div style={{ background: '#1a1a1a', border: '1px solid #ff66cc44', borderRadius: 12, padding: 20 }}>
              <p style={{ color: '#888', fontSize: 12, margin: '0 0 6px' }}>Dernière mise à jour</p>
              <p style={{ color: '#ff66cc', fontSize: 14, fontWeight: 700, margin: 0 }}>{new Date(feed.updatedAt).toLocaleTimeString()}</p>
            </div>
          </div>

          {feed.codesByProvider.map(p => (
            <div key={p.name} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, color: '#fff' }}>
                {p.name} — <span style={{ color: '#888', fontWeight: 400, fontSize: 13 }}>{p.total} codes importés</span>
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12 }}>
                {[
                  { label: 'Total', value: p.total, color: '#00d4ff' },
                  { label: 'Disponibles', value: p.available, color: '#00cc66' },
                  { label: 'Vendus', value: p.used, color: '#ffaa00' },
                  { label: 'Stock 3 Mois', value: p.p3mois, color: '#aa66ff' },
                  { label: 'Stock 6 Mois', value: p.p6mois, color: '#ff66cc' },
                  { label: 'Stock 12 Mois', value: p.p12mois, color: '#00d4ff' },
                ].map(s => (
                  <div key={s.label} style={{ background: '#0f0f0f', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                    <p style={{ color: '#666', fontSize: 11, margin: '0 0 4px' }}>{s.label}</p>
                    <p style={{ color: s.color, fontSize: 22, fontWeight: 700, margin: 0 }}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div style={{ background: '#1a1a1a', border: '1px solid #ffaa0044', borderRadius: 12, padding: 20 }}>
            <p style={{ color: '#888', fontSize: 13, margin: 0 }}>
              💡 <strong style={{ color: '#fff' }}>{feed.trials.freeRemaining}</strong> essais gratuits restants sur 30. 
              Va dans <strong style={{ color: '#00d4ff' }}>Codes</strong> pour importer des codes d'activation depuis ton panel Atlas.
            </p>
          </div>
        </>
      )}

      {/* TAB: Deliveries */}
      {tab === 'deliveries' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Total commandes', value: deliveries.stats.total, color: '#00d4ff' },
              { label: 'Livrées ✅', value: deliveries.stats.delivered, color: '#00cc66' },
              { label: 'En attente ⏳', value: deliveries.stats.pending, color: '#ffaa00' },
              { label: 'Échouées ❌', value: deliveries.stats.failed, color: '#ff4444' },
            ].map(s => (
              <div key={s.label} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 16 }}>
                <p style={{ color: '#666', fontSize: 12, margin: '0 0 6px' }}>{s.label}</p>
                <p style={{ color: s.color, fontSize: 24, fontWeight: 700, margin: 0 }}>{s.value}</p>
              </div>
            ))}
          </div>

          <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>Dernières livraisons</h3>
            {deliveries.deliveries.length > 0 ? (
              <div style={{ display: 'grid', gap: 6 }}>
                {deliveries.deliveries.map(d => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#0f0f0f', borderRadius: 8, fontSize: 13 }}>
                    <span style={{ color: d.delivery_status === 'sent' ? '#00cc66' : '#ffaa00', fontWeight: 700 }}>
                      {d.delivery_status === 'sent' ? '✅' : '⏳'}
                    </span>
                    <span style={{ flex: 1, color: '#fff' }}>{d.customer_name || d.customer_email}</span>
                    <span style={{ color: '#888' }}>{d.plan_name}</span>
                    <span style={{ color: d.order_status === 'completed' ? '#00cc66' : '#ffaa00', fontWeight: 600 }}>
                      €{d.amount?.toFixed(2)}
                    </span>
                    <span style={{ color: '#666', fontSize: 11 }}>
                      {new Date(d.created_at).toLocaleDateString()} {new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {d.credentials_sent_at && <span style={{ color: '#00cc66', fontSize: 11 }}>📧 envoyé</span>}
                  </div>
                ))}
              </div>
            ) : <p style={{ color: '#666', fontSize: 13 }}>Aucune commande pour l'instant</p>}
          </div>
        </>
      )}
    </div>
  )
}
