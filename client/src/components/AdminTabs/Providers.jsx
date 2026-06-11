import { useState, useEffect } from 'react'
import api from '../../api'

export default function Providers() {
  const [providers, setProviders] = useState([])
  const [alerts, setAlerts] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [showPlanModal, setShowPlanModal] = useState(null)
  const [showEditPlanModal, setShowEditPlanModal] = useState(null)
  const [showM3uModal, setShowM3uModal] = useState(null)
  const [showCodesModal, setShowCodesModal] = useState(null)
  const [form, setForm] = useState({ name: '', specialty: '', website: '', panel_url: '', panel_username: '', panel_password: '', notes: '' })
  const [planForm, setPlanForm] = useState({ plan_name: '', plan_type: 'monthly', duration_months: 1, price_cost: 0, price_sell: 0, channels: 0, streams: 1, paypal_link: '', sellup_product_id: '', min_stock: 5 })
  const [m3uUrl, setM3uUrl] = useState('')
  const [m3uLoading, setM3uLoading] = useState(false)
  const [m3uResult, setM3uResult] = useState(null)
  const [codeInput, setCodeInput] = useState('')
  const [codeType, setCodeType] = useState('activation')
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeResult, setCodeResult] = useState(null)
  const [selectedProvider, setSelectedProvider] = useState(null)
  const [loading, setLoading] = useState(false)
  const [inventoryStatus, setInventoryStatus] = useState([])
  const [inventorySettings, setInventorySettings] = useState({})
  const [showInventoryModal, setShowInventoryModal] = useState(false)
  const [inventoryThreshold, setInventoryThreshold] = useState({ providerId: '', type: 'activation', threshold: 5 })
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)

  function loadInventory() {
    api.get('/inventory/status').then(r => {
      setInventoryStatus(r.data.status || [])
    }).catch(() => {})
    api.get('/inventory/settings').then(r => {
      setInventorySettings(r.data.settings || {})
    }).catch(() => {})
    api.get('/inventory/notifications').then(r => {
      setNotifications(r.data.notifications || [])
      setUnreadCount(r.data.unread || 0)
    }).catch(() => {})
  }

  function load() {
    api.get('/panel-management/panels').then(r => {
      setProviders(r.data.panels || [])
      setAlerts(r.data.alerts || [])
    }).catch(() => {})
  }
  useEffect(load, [])
  useEffect(loadInventory, [])

  function runInventoryCheck() {
    setLoading(true)
    api.post('/inventory/check').then(r => {
      alert(`Check complete! ${r.data.alerts?.length || 0} alerts found, ${r.data.notifications?.length || 0} sent`)
      loadInventory()
    }).catch(() => {}).finally(() => setLoading(false))
  }

  function updateThreshold() {
    const { providerId, type, threshold } = inventoryThreshold
    if (!providerId) return alert('Select a provider first')
    api.post('/inventory/threshold', { providerId, type, threshold }).then(() => {
      alert('Threshold updated')
      loadInventory()
    }).catch(() => {})
  }

  function updateSettings() {
    api.post('/inventory/settings', inventorySettings).then(() => {
      alert('Settings saved')
    }).catch(() => {})
  }

  function markNotificationsRead() {
    api.post('/inventory/notifications/read', { ids: 'all' }).then(() => {
      loadInventory()
    }).catch(() => {})
  }

  function addProvider() {
    api.post('/panel-management/panels', form).then(() => {
      load()
      setShowModal(false)
      setForm({ name: '', specialty: '', website: '', panel_url: '', panel_username: '', panel_password: '', notes: '' })
    }).catch(() => {})
  }

  function addPlan(providerId) {
    api.post(`/admin/providers/${providerId}/plans`, planForm).then(() => {
      load()
      setShowPlanModal(null)
      setPlanForm({ plan_name: '', plan_type: 'monthly', duration_months: 1, price_cost: 0, price_sell: 0, channels: 0, streams: 1, paypal_link: '', sellup_product_id: '', min_stock: 5 })
    }).catch(() => {})
  }

  function editPlan(plan) {
    setPlanForm({
      plan_name: plan.plan_name || '',
      plan_type: plan.plan_type || 'monthly',
      duration_months: plan.duration_months || Math.round((plan.duration_days || 30) / 30) || 1,
      price_cost: plan.price_cost || 0,
      price_sell: plan.price_sell || 0,
      channels: plan.channels || 0,
      streams: plan.streams || 1,
      paypal_link: plan.paypal_link || '',
      sellup_product_id: plan.sellup_product_id || '',
      min_stock: plan.min_stock ?? 5
    })
    setShowEditPlanModal(plan.id)
  }

  function saveEditPlan() {
    api.put(`/admin/plans/${showEditPlanModal}`, planForm).then(() => {
      load()
      setShowEditPlanModal(null)
      setPlanForm({ plan_name: '', plan_type: 'monthly', duration_months: 1, price_cost: 0, price_sell: 0, channels: 0, streams: 1, paypal_link: '', sellup_product_id: '', min_stock: 5 })
    }).catch(() => {})
  }

  function deletePlan(planId) {
    if (!confirm('Delete this plan?')) return
    api.delete(`/admin/plans/${planId}`).then(load)
  }

  function toggleProvider(id) {
    const p = providers.find(x => x.id === id)
    api.post('/panel-management/panels', { ...p, active: !p.active }).then(load)
  }

  function deleteProvider(id) {
    if (!confirm('Delete this provider?')) return
    api.delete(`/panel-management/panels/${id}`).then(load)
  }

  function syncPanel(id) {
    setLoading(true)
    api.post(`/panel-management/panels/${id}/sync`).then(r => {
      alert(r.data.success ? `Sync complete: ${r.data.codes} codes` : `Sync failed: ${r.data.error}`)
      load()
    }).catch(() => {}).finally(() => setLoading(false))
  }

  function provisionProvider(id) {
    if (!confirm('Run auto-provision? This will sync codes, parse M3U, create plans, and build pages.')) return
    setLoading(true)
    api.post(`/admin/providers/${id}/provision`).then(r => {
      alert(`✅ Provision complete!\n${r.data.log?.join('\n') || 'Success'}`)
      load()
    }).catch(e => alert(`❌ Provision failed: ${e.response?.data?.error || e.message}`)).finally(() => setLoading(false))
  }

  function saveM3U() {
    if (!showM3uModal || !m3uUrl) return
    setM3uLoading(true)
    api.post('/panel-management/m3u', { providerId: showM3uModal, m3uUrl }).then(r => {
      setM3uResult(r.data)
      if (r.data.success) {
        setTimeout(() => { setShowM3uModal(null); setM3uUrl(''); setM3uResult(null) }, 2000)
      }
    }).catch(() => {}).finally(() => setM3uLoading(false))
  }

  function addCodes() {
    if (!showCodesModal || !codeInput) return
    setCodeLoading(true)
    const codes = codeInput.split('\n').filter(c => c.trim())
    if (codeType === 'activation') {
      api.post(`/panel-management/panels/${showCodesModal}/codes`, { planId: 1, codes }).then(r => {
        setCodeResult(r.data)
        if (r.data.added > 0) {
          setTimeout(() => { setShowCodesModal(null); setCodeInput(''); setCodeResult(null); load() }, 2000)
        }
      }).catch(() => {}).finally(() => setCodeLoading(false))
    } else {
      api.post(`/panel-management/panels/${showCodesModal}/trial-codes`, { codes }).then(r => {
        setCodeResult(r.data)
        if (r.data.added > 0) {
          setTimeout(() => { setShowCodesModal(null); setCodeInput(''); setCodeResult(null); load() }, 2000)
        }
      }).catch(() => {}).finally(() => setCodeLoading(false))
    }
  }

  function stockColor(available, minStock) {
    if (available === 0) return '#ff4444'
    if (available <= minStock) return '#ffd700'
    return '#00cc66'
  }

  return (
    <div>
      {alerts.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {alerts.map((a, i) => (
            <div key={i} style={{ background: a.urgent ? '#ff444415' : '#ffd70015', border: `1px solid ${a.urgent ? '#ff4444' : '#ffd700'}`, borderRadius: 8, padding: 12, marginBottom: 8, color: '#fff', fontSize: 13 }}>
              ⚠️ <strong>{a.provider}</strong>: {a.type} stock low — {a.remaining} remaining
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <p style={{ color: '#666', margin: 0 }}>{providers.length} providers</p>
          {unreadCount > 0 && (
            <button onClick={() => setShowNotifications(!showNotifications)} style={{ background: '#ff444415', border: '1px solid #ff4444', color: '#ff4444', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              🔴 {unreadCount} unread alerts
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setShowInventoryModal(true)} style={{ background: '#1a1a1a', color: '#00d4ff', border: '1px solid #00d4ff', padding: '8px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
            ⚙️ Inventory Settings
          </button>
          <button onClick={runInventoryCheck} disabled={loading} style={{ background: '#00d4ff', color: '#000', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
            {loading ? '⏳ Checking...' : '🔍 Check Now'}
          </button>
          <button onClick={() => setShowModal(true)} style={{ background: '#00d4ff', color: '#000', border: 'none', padding: '8px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
            + Add Provider
          </button>
        </div>
      </div>

      {showNotifications && notifications.length > 0 && (
        <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 16, marginBottom: 20, maxHeight: 300, overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h4 style={{ margin: 0, color: '#00d4ff', fontSize: 14 }}>🔔 Recent Alerts</h4>
            <button onClick={markNotificationsRead} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#888', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}>
              Mark all read
            </button>
          </div>
          {notifications.map((n, i) => (
            <div key={i} style={{ padding: 8, borderBottom: '1px solid #2a2a2a', fontSize: 12, color: n.read ? '#888' : '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: n.type === 'urgent_stock' ? '#ff4444' : '#ffd700', fontWeight: 600 }}>{n.title}</span>
                <span style={{ color: '#555', fontSize: 10 }}>{new Date(n.created_at).toLocaleString()}</span>
              </div>
              <div style={{ color: '#888', marginTop: 2 }}>{n.message}</div>
            </div>
          ))}
        </div>
      )}

      {inventoryStatus.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 12px', color: '#00d4ff', fontSize: 14 }}>📦 Inventory Status</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {inventoryStatus.map((inv, i) => (
              <div key={i} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 16 }}>
                <div style={{ fontWeight: 700, color: '#00d4ff', marginBottom: 8, fontSize: 14 }}>{inv.provider.name}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <div style={{ background: '#0f0f0f', borderRadius: 6, padding: 8, textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: inv.activation.low ? '#ff4444' : '#00d4ff' }}>{inv.activation.available}</div>
                    <div style={{ fontSize: 10, color: '#888' }}>Activation</div>
                    <div style={{ fontSize: 9, color: '#555' }}>threshold: {inv.activation.threshold}</div>
                  </div>
                  <div style={{ background: '#0f0f0f', borderRadius: 6, padding: 8, textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: inv.trials.low ? '#ff4444' : '#ffd700' }}>{inv.trials.available}</div>
                    <div style={{ fontSize: 10, color: '#888' }}>Trials</div>
                    <div style={{ fontSize: 9, color: '#555' }}>threshold: {inv.trials.threshold}</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#888' }}>
                  Total sold: {inv.activation.sold} activation, {inv.trials.used} trials
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill,minmax(400px,1fr))' }}>
        {providers.map(p => (
          <div key={p.id} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, color: '#00d4ff' }}>{p.name}</h3>
                <p style={{ color: '#666', fontSize: 13, margin: '4px 0 0' }}>{p.specialty || 'General'}</p>
                {p.panel_url && <p style={{ color: '#555', fontSize: 11, margin: '2px 0 0' }}>{p.panel_url}</p>}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => toggleProvider(p.id)} style={{ background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: p.active ? '#00cc66' : '#ff4444', fontSize: 12 }}>
                  {p.active ? 'Active' : 'Inactive'}
                </button>
                <button onClick={() => deleteProvider(p.id)} style={{ background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#ff4444', fontSize: 12 }}>
                  ✕
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div style={{ background: '#0f0f0f', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#00d4ff' }}>{p.activationCodes?.available || 0}</div>
                <div style={{ fontSize: 11, color: '#888' }}>Activation Codes</div>
                <div style={{ fontSize: 10, color: '#555' }}>{p.activationCodes?.sold || 0} sold, {p.activationCodes?.today || 0} today</div>
              </div>
              <div style={{ background: '#0f0f0f', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#ffd700' }}>{p.trialCodes?.available || 0}</div>
                <div style={{ fontSize: 11, color: '#888' }}>Trial Codes</div>
                <div style={{ fontSize: 10, color: '#555' }}>{p.trialCodes?.sent || 0} sent, {p.trialCodes?.today || 0} today</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: '#00d4ff' }}>Revenue: ${(p.orders?.revenueToday || 0).toFixed(2)}</span>
              <span style={{ fontSize: 12, color: '#888' }}>Orders: {p.orders?.today || 0}</span>
            </div>

            {/* Plans list with stock */}
            {p.plans && p.plans.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ color: '#888', fontSize: 11, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Plans</p>
                {p.plans.map(pl => (
                  <div key={pl.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0f0f0f', borderRadius: 8, padding: '8px 12px', marginBottom: 4, fontSize: 12 }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ color: '#fff', fontWeight: 600 }}>{pl.plan_name}</span>
                      {pl.duration_months ? <span style={{ color: '#888', marginLeft: 8 }}>{pl.duration_months}mois</span> : <span style={{ color: '#888', marginLeft: 8 }}>{pl.duration_days || 30}j</span>}
                      <span style={{ color: '#00d4ff', marginLeft: 8, fontWeight: 700 }}>{pl.price_sell}€</span>
                      <span style={{ color: '#555', marginLeft: 4, fontSize: 10 }}>unique</span>
                      {!pl.active && <span style={{ color: '#ff4444', marginLeft: 6, fontSize: 10 }}>INACTIF</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        background: '#151515', borderRadius: 6, padding: '2px 8px',
                        color: stockColor(pl.codes_available || 0, pl.min_stock ?? 5),
                        fontWeight: 700, fontSize: 13
                      }}>
                        <span style={{ fontSize: 10 }}>📦</span>
                        {pl.codes_available || 0}
                      </span>
                      <span style={{ color: '#555', fontSize: 10 }}>/ min {pl.min_stock ?? 5}</span>
                      <button onClick={() => editPlan(pl)} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: 11, padding: 2 }}>✏️</button>
                      <button onClick={() => deletePlan(pl.id)} style={{ background: 'transparent', border: 'none', color: '#ff444488', cursor: 'pointer', fontSize: 11, padding: 2 }}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <button onClick={() => { setShowCodesModal(p.id); setSelectedProvider(p) }} style={{ background: '#00d4ff15', color: '#00d4ff', border: '1px solid #00d4ff', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                + Codes
              </button>
              <button onClick={() => { setShowM3uModal(p.id); setSelectedProvider(p) }} style={{ background: '#7b2dff15', color: '#7b2dff', border: '1px solid #7b2dff', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                M3U URL
              </button>
              <button onClick={() => syncPanel(p.id)} disabled={loading} style={{ background: '#00ff8815', color: '#00ff88', border: '1px solid #00ff88', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                🔄 Sync
              </button>
              <button onClick={() => provisionProvider(p.id)} disabled={loading} style={{ background: '#7b2dff15', color: '#7b2dff', border: '1px solid #7b2dff', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                🚀 Provision
              </button>
              <button onClick={() => setShowPlanModal(p.id)} style={{ background: 'transparent', color: '#00d4ff', border: '1px solid #00d4ff', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                + Plan
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Provider Modal */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)} title="Add Provider">
          <Field label="Provider Name" desc="Le nom du fournisseur IPTV (ex: Atlas Pro, StreamMax)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Field label="Specialty" desc="Spécialité (ex: Sports, Arabic, General, VOD)" value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} />
          <Field label="Website URL" desc="Site web du fournisseur" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
          <Field label="Panel URL" desc="URL du panneau de gestion Xtream UI ou autre" value={form.panel_url} onChange={e => setForm(f => ({ ...f, panel_url: e.target.value }))} />
          <Field label="Panel Username" desc="Nom d'utilisateur pour le panneau" value={form.panel_username} onChange={e => setForm(f => ({ ...f, panel_username: e.target.value }))} />
          <Field label="Panel Password" desc="Mot de passe pour le panneau" type="password" value={form.panel_password} onChange={e => setForm(f => ({ ...f, panel_password: e.target.value }))} />
          <TextareaField label="Notes" desc="Notes internes sur ce fournisseur" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          <button onClick={addProvider} style={btnStyle}>Save Provider</button>
        </Modal>
      )}

      {/* Add Plan Modal */}
      {showPlanModal && (
        <Modal onClose={() => setShowPlanModal(null)} title="Add Plan">
          <Field label="Plan Name" desc="Nom du plan (ex: Premium, Ultimate, Trial 72h)" value={planForm.plan_name} onChange={e => setPlanForm(f => ({ ...f, plan_name: e.target.value }))} />
          <SelectField label="Plan Type" desc="Type d'abonnement" value={planForm.plan_type} onChange={e => setPlanForm(f => ({ ...f, plan_type: e.target.value }))} options={[
            { value: 'monthly', label: 'Monthly (Mensuel)' },
            { value: 'quarterly', label: 'Quarterly (Trimestriel)' },
            { value: 'yearly', label: 'Yearly (Annuel)' },
            { value: 'trial', label: 'Trial (Essai gratuit)' }
          ]} />
          <Field label="Duration (Months)" desc="Nombre de mois (ex: 1 pour 1 mois, 3 pour 3 mois, 12 pour 1 an)" type="number" min={1} value={planForm.duration_months} onChange={e => setPlanForm(f => ({ ...f, duration_months: parseInt(e.target.value) || 1, duration_days: (parseInt(e.target.value) || 1) * 30 }))} />
          <Field label="Cost Price (€)" desc="Prix d'achat / coût du plan auprès du fournisseur" type="number" min={0} step={0.01} value={planForm.price_cost} onChange={e => setPlanForm(f => ({ ...f, price_cost: parseFloat(e.target.value) || 0 }))} />
          <Field label="Sell Price (€)" desc="Prix de vente au client final" type="number" min={0} step={0.01} value={planForm.price_sell} onChange={e => setPlanForm(f => ({ ...f, price_sell: parseFloat(e.target.value) || 0 }))} />
          <Field label="Channels" desc="Nombre de chaînes incluses" type="number" min={0} value={planForm.channels} onChange={e => setPlanForm(f => ({ ...f, channels: parseInt(e.target.value) || 0 }))} />
          <Field label="Streams" desc="Nombre d'écrans simultanés autorisés" type="number" min={1} value={planForm.streams} onChange={e => setPlanForm(f => ({ ...f, streams: parseInt(e.target.value) || 1 }))} />
          <Field label="Minimum Stock" desc="Stock minimum avant alerte (nombre de codes d'activation)" type="number" min={0} value={planForm.min_stock} onChange={e => setPlanForm(f => ({ ...f, min_stock: parseInt(e.target.value) || 5 }))} />
          <Field label="Sellup Product ID" desc="ID produit Sellup (pour les paiements via Sellup)" value={planForm.sellup_product_id} onChange={e => setPlanForm(f => ({ ...f, sellup_product_id: e.target.value }))} />
          <Field label="PayPal Link" desc="Lien PayPal pour paiement direct (ex: https://paypal.me/...)" value={planForm.paypal_link} onChange={e => setPlanForm(f => ({ ...f, paypal_link: e.target.value }))} />
          <button onClick={() => addPlan(showPlanModal)} style={btnStyle}>Save Plan</button>
        </Modal>
      )}

      {/* Edit Plan Modal */}
      {showEditPlanModal && (
        <Modal onClose={() => setShowEditPlanModal(null)} title="Edit Plan">
          <Field label="Plan Name" desc="Nom du plan" value={planForm.plan_name} onChange={e => setPlanForm(f => ({ ...f, plan_name: e.target.value }))} />
          <SelectField label="Plan Type" desc="Type d'abonnement" value={planForm.plan_type} onChange={e => setPlanForm(f => ({ ...f, plan_type: e.target.value }))} options={[
            { value: 'monthly', label: 'Monthly (Mensuel)' },
            { value: 'quarterly', label: 'Quarterly (Trimestriel)' },
            { value: 'yearly', label: 'Yearly (Annuel)' },
            { value: 'trial', label: 'Trial (Essai gratuit)' }
          ]} />
          <Field label="Duration (Months)" desc="Nombre de mois" type="number" min={1} value={planForm.duration_months} onChange={e => setPlanForm(f => ({ ...f, duration_months: parseInt(e.target.value) || 1, duration_days: (parseInt(e.target.value) || 1) * 30 }))} />
          <Field label="Cost Price (€)" desc="Prix d'achat" type="number" min={0} step={0.01} value={planForm.price_cost} onChange={e => setPlanForm(f => ({ ...f, price_cost: parseFloat(e.target.value) || 0 }))} />
          <Field label="Sell Price (€)" desc="Prix de vente" type="number" min={0} step={0.01} value={planForm.price_sell} onChange={e => setPlanForm(f => ({ ...f, price_sell: parseFloat(e.target.value) || 0 }))} />
          <Field label="Channels" desc="Nombre de chaînes" type="number" min={0} value={planForm.channels} onChange={e => setPlanForm(f => ({ ...f, channels: parseInt(e.target.value) || 0 }))} />
          <Field label="Streams" desc="Écrans simultanés" type="number" min={1} value={planForm.streams} onChange={e => setPlanForm(f => ({ ...f, streams: parseInt(e.target.value) || 1 }))} />
          <Field label="Minimum Stock" desc="Stock minimum avant alerte" type="number" min={0} value={planForm.min_stock} onChange={e => setPlanForm(f => ({ ...f, min_stock: parseInt(e.target.value) || 5 }))} />
          <Field label="Sellup Product ID" desc="ID produit Sellup" value={planForm.sellup_product_id} onChange={e => setPlanForm(f => ({ ...f, sellup_product_id: e.target.value }))} />
          <Field label="PayPal Link" desc="Lien PayPal" value={planForm.paypal_link} onChange={e => setPlanForm(f => ({ ...f, paypal_link: e.target.value }))} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={saveEditPlan} style={{ ...btnStyle, flex: 1 }}>💾 Save Changes</button>
            <button onClick={() => setShowEditPlanModal(null)} style={{ ...btnStyle, flex: 1, background: '#2a2a2a', color: '#888' }}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* M3U URL Modal */}
      {showM3uModal && (
        <Modal onClose={() => setShowM3uModal(null)} title={`M3U URL - ${selectedProvider?.name}`}>
          <p style={{ color: '#888', fontSize: 12, marginBottom: 12 }}>Enter a sample M3U URL. The system will parse it and auto-generate content (sports, movies, series) for the website.</p>
          <input placeholder="https://example.com/playlist.m3u" value={m3uUrl} onChange={e => setM3uUrl(e.target.value)} style={inputStyle} />
          {m3uResult && (
            <div style={{ background: '#0f0f0f', borderRadius: 8, padding: 12, fontSize: 12, color: '#00d4ff' }}>
              {m3uResult.success ? `✅ Parsed! Stats: ${JSON.stringify(m3uResult.parsed?.stats)}` : `❌ Failed: ${m3uResult.error}`}
            </div>
          )}
          <button onClick={saveM3U} disabled={m3uLoading} style={btnStyle}>{m3uLoading ? 'Parsing...' : 'Save M3U URL'}</button>
        </Modal>
      )}

      {/* Add Codes Modal */}
      {showCodesModal && (
        <Modal onClose={() => setShowCodesModal(null)} title={`Add Codes - ${selectedProvider?.name}`}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button onClick={() => setCodeType('activation')} style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid', cursor: 'pointer', background: codeType === 'activation' ? '#00d4ff' : '#1a1a1a', color: codeType === 'activation' ? '#000' : '#888', borderColor: codeType === 'activation' ? '#00d4ff' : '#2a2a2a', fontWeight: 600, fontSize: 12 }}>
              Activation Codes
            </button>
            <button onClick={() => setCodeType('trial')} style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid', cursor: 'pointer', background: codeType === 'trial' ? '#ffd700' : '#1a1a1a', color: codeType === 'trial' ? '#000' : '#888', borderColor: codeType === 'trial' ? '#ffd700' : '#2a2a2a', fontWeight: 600, fontSize: 12 }}>
              Trial Codes
            </button>
          </div>
          <p style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>Enter one code per line:</p>
          <textarea placeholder="ABC123&#10;DEF456&#10;GHI789" value={codeInput} onChange={e => setCodeInput(e.target.value)} style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }} />
          {codeResult && (
            <div style={{ background: '#0f0f0f', borderRadius: 8, padding: 12, fontSize: 12, color: '#00d4ff' }}>
              {codeResult.added ? `✅ ${codeResult.added} codes added` : `❌ Failed`}
            </div>
          )}
          <button onClick={addCodes} disabled={codeLoading} style={btnStyle}>{codeLoading ? 'Adding...' : `Add ${codeType === 'activation' ? 'Activation' : 'Trial'} Codes`}</button>
        </Modal>
      )}

      {/* Inventory Settings Modal */}
      {showInventoryModal && (
        <Modal onClose={() => setShowInventoryModal(null)} title="Inventory Monitor Settings">
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ margin: '0 0 8px', color: '#00d4ff', fontSize: 13 }}>📊 Set Thresholds</h4>
            <p style={{ color: '#888', fontSize: 11, margin: '0 0 8px' }}>Alert when stock falls below threshold</p>
            <select value={inventoryThreshold.providerId} onChange={e => setInventoryThreshold(t => ({ ...t, providerId: e.target.value }))} style={inputStyle}>
              <option value="">Select Provider</option>
              {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={inventoryThreshold.type} onChange={e => setInventoryThreshold(t => ({ ...t, type: e.target.value }))} style={inputStyle}>
              <option value="activation">Activation Codes</option>
              <option value="trial">Trial Codes</option>
            </select>
            <input type="number" placeholder="Threshold (e.g. 5)" value={inventoryThreshold.threshold} onChange={e => setInventoryThreshold(t => ({ ...t, threshold: parseInt(e.target.value) || 5 }))} style={inputStyle} />
            <button onClick={updateThreshold} style={btnStyle}>Update Threshold</button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h4 style={{ margin: '0 0 8px', color: '#00d4ff', fontSize: 13 }}>🔔 Notifications</h4>
            <p style={{ color: '#888', fontSize: 11, margin: '0 0 8px' }}>Configure where to send alerts</p>
            <input placeholder="Email address" value={inventorySettings.email || ''} onChange={e => setInventorySettings(s => ({ ...s, email: e.target.value }))} style={inputStyle} />
            <input placeholder="Telegram Bot Token" value={inventorySettings.telegram || ''} onChange={e => setInventorySettings(s => ({ ...s, telegram: e.target.value }))} style={inputStyle} />
            <input placeholder="Webhook URL" value={inventorySettings.webhook || ''} onChange={e => setInventorySettings(s => ({ ...s, webhook: e.target.value }))} style={inputStyle} />
            <button onClick={updateSettings} style={btnStyle}>Save Settings</button>
          </div>

          <div>
            <h4 style={{ margin: '0 0 8px', color: '#00d4ff', fontSize: 13 }}>📈 Current Thresholds</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
              {inventoryStatus.map((inv, i) => (
                <div key={i} style={{ background: '#0f0f0f', borderRadius: 6, padding: 8 }}>
                  <div style={{ color: '#00d4ff', fontWeight: 600 }}>{inv.provider.name}</div>
                  <div style={{ color: '#888' }}>Activation: {inv.activation.threshold} | Trial: {inv.trials.threshold}</div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Field({ label, desc, type, min, step, value, onChange }) {
  return (
    <div>
      <label style={{ color: '#fff', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 2 }}>{label}</label>
      <p style={{ color: '#888', fontSize: 11, margin: '0 0 6px' }}>{desc}</p>
      <input type={type || 'text'} min={min} step={step} value={value} onChange={onChange} style={inputStyle} />
    </div>
  )
}

function SelectField({ label, desc, value, onChange, options }) {
  return (
    <div>
      <label style={{ color: '#fff', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 2 }}>{label}</label>
      <p style={{ color: '#888', fontSize: 11, margin: '0 0 6px' }}>{desc}</p>
      <select value={value} onChange={onChange} style={inputStyle}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function TextareaField({ label, desc, value, onChange }) {
  return (
    <div>
      <label style={{ color: '#fff', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 2 }}>{label}</label>
      <p style={{ color: '#888', fontSize: 11, margin: '0 0 6px' }}>{desc}</p>
      <textarea value={value} onChange={onChange} style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} />
    </div>
  )
}

function Modal({ onClose, title, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 16, padding: 24, width: 480, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#a0a0a0', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #2a2a2a',
  background: '#0f0f0f', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box',
}

const btnStyle = {
  width: '100%', padding: '10px', background: '#00d4ff', color: '#000', border: 'none',
  borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14, marginTop: 8,
}
