import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import AdminDashboard from './pages/AdminDashboard'
import DynamicLP from './pages/DynamicLP'
import CheckoutPage from './pages/CheckoutPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/admin/*" element={<AdminDashboard />} />
      <Route path="/lp/:slug" element={<DynamicLP />} />
      <Route path="/checkout" element={<CheckoutPage />} />
    </Routes>
  )
}
