import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import './index.css'

// Auth pages (Phase 1)
import Login from './pages/Login'
import Register from './pages/Register'

// Role dashboards (Phases 2-5)
import FarmerDashboard from './pages/farmer/Dashboard'
import FarmerListings from './pages/farmer/Listings'
import FarmerOrders from './pages/farmer/Orders'
import ConsumerBrowse from './pages/consumer/Browse'
import ConsumerOrders from './pages/consumer/Orders'
import TransporterFeed from './pages/transporter/Feed'
import MarketDashboard from './pages/shared/Dashboard'
import ForecastsPage from './pages/shared/Forecasts'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminListings from './pages/admin/AdminListings'
import AdminOrders from './pages/admin/AdminOrders'
import NotFound from './pages/NotFound'

import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<ProtectedRoute allowedRoles={['farmer']} />}>
          <Route path="/farmer/dashboard" element={<FarmerDashboard />} />
          <Route path="/farmer/listings"  element={<FarmerListings />} />
          <Route path="/farmer/orders"    element={<FarmerOrders />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['consumer', 'wholesaler', 'retailer', 'direct_consumer']} />}>
          <Route path="/consumer/browse" element={<ConsumerBrowse />} />
          <Route path="/consumer/orders" element={<ConsumerOrders />} />
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
          <Route path="/admin/users"    element={<AdminUsers />} />
          <Route path="/admin/listings" element={<AdminListings />} />
          <Route path="/admin/orders"   element={<AdminOrders />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
