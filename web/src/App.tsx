import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import { track } from './lib/analytics'
import './index.css'

// Auth pages (Phase 1)
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'

// Role dashboards (Phases 2-5)
import FarmerDashboard from './pages/farmer/Dashboard'
import FarmerListings from './pages/farmer/Listings'
import FarmerOrders from './pages/farmer/Orders'
import ConsumerBrowse from './pages/consumer/Browse'
import ConsumerOrders from './pages/consumer/Orders'
import Checkout from './pages/checkout/Checkout'
import PaymentCallback from './pages/checkout/PaymentCallback'
import TransporterFeed from './pages/transporter/Feed'
import MarketDashboard from './pages/shared/Dashboard'
import ForecastsPage from './pages/shared/Forecasts'
import AdminDashboard from './pages/admin/AdminDashboard'
import ForecastInsights from './pages/admin/ForecastInsights'
import AdminUsers from './pages/admin/AdminUsers'
import AdminListings from './pages/admin/AdminListings'
import AdminOrders from './pages/admin/AdminOrders'
import NotFound from './pages/NotFound'

import ProtectedRoute from './components/ProtectedRoute'

/** Emits a page_view event on every route change. */
function PageViewTracker() {
  const location = useLocation()
  useEffect(() => {
    track('page_view', { metadata: { path: location.pathname } })
  }, [location.pathname])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <PageViewTracker />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route element={<ProtectedRoute allowedRoles={['farmer']} />}>
          <Route path="/farmer/dashboard" element={<FarmerDashboard />} />
          <Route path="/farmer/listings"  element={<FarmerListings />} />
          <Route path="/farmer/orders"    element={<FarmerOrders />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['consumer', 'wholesaler', 'retailer', 'direct_consumer']} />}>
          <Route path="/consumer/browse" element={<ConsumerBrowse />} />
          <Route path="/consumer/orders" element={<ConsumerOrders />} />
          <Route path="/checkout/:listingId" element={<Checkout />} />
          <Route path="/payment/callback" element={<PaymentCallback />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['transporter']} />}>
          <Route path="/transporter/feed" element={<TransporterFeed />} />
          <Route path="/transporter/deliveries" element={<TransporterFeed />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['farmer','admin']} />}>
          <Route path="/market" element={<MarketDashboard />} />
          <Route path="/forecasts" element={<ForecastsPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin"          element={<AdminDashboard />} />
          <Route path="/admin/insights" element={<ForecastInsights />} />
          <Route path="/admin/users"    element={<AdminUsers />} />
          <Route path="/admin/listings" element={<AdminListings />} />
          <Route path="/admin/orders"   element={<AdminOrders />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
