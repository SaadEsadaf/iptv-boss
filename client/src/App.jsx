import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import LuxStreamLanding from './pages/LuxStreamLanding'
import AdminDashboard from './pages/AdminDashboard'
import DynamicLP from './pages/DynamicLP'
import CheckoutPage from './pages/CheckoutPage'
import PaymentResult from './pages/PaymentResult'

export default function App() {
  const ws = typeof window !== 'undefined' && window.__WEBSITE__
  const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
  const isLuxStream = hostname.includes('dalletek.live') || hostname.includes('luxstream') || ws?.site_name?.toLowerCase().includes('lux') || ws?.name?.toLowerCase().includes('lux') || ws?.slug?.toLowerCase().includes('lux')

  return (
    <Routes>
      <Route path="/" element={isLuxStream ? <LuxStreamLanding /> : <LandingPage />} />
      <Route path="/lux" element={<LuxStreamLanding />} />
      <Route path="/admin/*" element={<AdminDashboard />} />
      <Route path="/lp/:slug" element={<DynamicLP />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/payment/success" element={<PaymentResult />} />
      <Route path="/payment/cancel" element={<PaymentResult />} />
    </Routes>
  )
}
