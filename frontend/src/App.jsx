import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './store/AuthContext';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmModal';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import CategoriesPage from './pages/CategoriesPage';
import FreeSalePage from './pages/FreeSalePage';
import ProductsPage from './pages/ProductsPage';
import AdminPage from './pages/AdminPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import ManageProductsPage from './pages/ManageProductsPage';
import ManageCategoriesPage from './pages/ManageCategoriesPage';
import EmployeeHomePage from './pages/EmployeeHomePage';
import SetupPasswordPage from './pages/SetupPasswordPage';
import SalesHistoryPage from './pages/SalesHistoryPage';
import CustomersPage from './pages/CustomersPage';
import GuestRegisterPage from './pages/GuestRegisterPage';
import SettingsPage from './pages/SettingsPage';
import { applyDarkMode, getAppSettings } from './services/appSettings.service';

export default function App() {
  useEffect(() => {
    const settings = getAppSettings();
    applyDarkMode(settings.darkMode);
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>
      <ConfirmProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/setup-password" element={<SetupPasswordPage />} />
          <Route path="/guest-register" element={<GuestRegisterPage />} />
          <Route path="/" element={<ProtectedRoute adminRedirect="/admin/dashboard"><EmployeeHomePage /></ProtectedRoute>} />
          <Route path="/sell" element={<ProtectedRoute requireSell><CategoriesPage /></ProtectedRoute>} />
          <Route path="/sell/free" element={<ProtectedRoute requireSell><FreeSalePage /></ProtectedRoute>} />
          <Route path="/products/:categoryId" element={<ProtectedRoute requireSell><ProductsPage /></ProtectedRoute>} />
          <Route path="/credits" element={<Navigate to="/sales" replace />} />
          <Route path="/sales" element={<ProtectedRoute requireSell><SalesHistoryPage /></ProtectedRoute>} />
          <Route path="/customers" element={<ProtectedRoute requireSellOrEdit><CustomersPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/admin/dashboard" element={<ProtectedRoute adminOnly><AdminDashboardPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute requireEdit><AdminPage /></ProtectedRoute>} />
          <Route path="/admin/products" element={<ProtectedRoute requireEdit><ManageProductsPage /></ProtectedRoute>} />
          <Route path="/admin/categories" element={<ProtectedRoute adminOnly><ManageCategoriesPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

