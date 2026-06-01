import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

export default function PaymentResult() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const sessionId = searchParams.get('session_id')
  const [status, setStatus] = useState(sessionId ? 'success' : 'cancel')

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 24 }}>
      {status === 'success' ? (
        <>
          <div style={{ fontSize: 56 }}>✅</div>
          <h2 style={{ margin: 0, color: '#00cc66' }}>Payment Successful!</h2>
          <p style={{ color: '#a0a0a0', textAlign: 'center', maxWidth: 400 }}>
            Your payment has been confirmed. Your activation credentials will be sent to your email within a few minutes.
          </p>
        </>
      ) : (
        <>
          <div style={{ fontSize: 56 }}>❌</div>
          <h2 style={{ margin: 0, color: '#ff4444' }}>Payment Cancelled</h2>
          <p style={{ color: '#a0a0a0', textAlign: 'center', maxWidth: 400 }}>
            Your payment was not completed. If this was a mistake, please try again.
          </p>
        </>
      )}
      <button onClick={() => navigate('/')} style={{
        padding: '12px 36px', background: '#00d4ff', color: '#000',
        border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 15,
      }}>Back to Home</button>
    </div>
  )
}
