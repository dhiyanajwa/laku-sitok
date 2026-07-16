import { Navigate, Route, Routes } from 'react-router-dom'
import VendorLayout from './components/VendorLayout'
import { AuthProvider } from './context/AuthContext'
import CustomerMenuPage from './pages/CustomerMenuPage'
import LoginPage from './pages/vendor/LoginPage'
import AdvisorPage from './pages/vendor/AdvisorPage'
import InventoryPage from './pages/vendor/InventoryPage'
import KitchenPage from './pages/vendor/KitchenPage'
import SettingsPage from './pages/vendor/SettingsPage'
import VendorDashboardPage from './pages/vendor/VendorDashboardPage'
import VendorOrdersPage from './pages/vendor/VendorOrdersPage'
import WelcomePage from './pages/WelcomePage'
import ProtectedRoute from './routes/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/menu" element={<CustomerMenuPage />} />
        <Route path="/vendor/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/vendor" element={<VendorLayout />}>
            <Route index element={<VendorDashboardPage />} />
            <Route path="orders" element={<VendorOrdersPage />} />
            <Route path="kitchen" element={<KitchenPage />} />
            <Route path="inventory" element={<InventoryPage />} />`n            <Route path="advisor" element={<AdvisorPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App

