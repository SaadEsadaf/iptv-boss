import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import CheckoutModal from '../components/CheckoutModal'

export default function CheckoutPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const orderId = searchParams.get('order')
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!orderId) { setError('No order ID specified'); return }
    fetch(`/api/orders/${orderId}`)
      .then(r => r.ok ? r.json() : Promise.reject('Order not found'))
      .then(data => setOrder(data))
      .catch(() => setError('Order not found'))
  }, [orderId])

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 48 }}>📧</div>
        <h2 style={{ margin: 0, color: '#ff4444' }}>Invalid or expired order</h2>
        <p style={{ color: '#a0a0a0' }}>{error}</p>
        <button onClick={() => navigate('/')} style={{ padding: '10px 24px', background: '#00d4ff', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Go Home</button>
      </div>
    )
  }

  if (!order) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading order...</p>
      </div>
    )
  }

  const plan = {
    id: order.plan_id,
    plan_name: order.plan_name,
    provider_name: order.provider_name,
    price_sell: order.amount,
    duration_days: order.duration_days || 30,
    duration_months: order.duration_months || Math.round((order.duration_days || 30) / 30) || 1,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      <CheckoutModal plan={plan} onClose={() => navigate('/')} />
    </div>
  )
}
