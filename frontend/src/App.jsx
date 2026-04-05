import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Toast from './components/Common/Toast';
import AdminLayout from './components/layout/AdminLayout';
import UserLayout from './components/layout/UserLayout';
import { CategoryPage } from './pages/user/CategoryPage';
import { BrandPage } from './pages/user/BrandPage';



// Auth pages
import { LoginPage, RegisterPage, ForgotPasswordPage, VerifyOtpPage } from './pages/auth/AuthPages';

// User pages
import { HomePage, ProductDetailPage, CartPage, MyOrdersPage } from './pages/user';
import { CheckoutPage } from './pages/user/CheckoutPage';
import { PaymentResultPage } from './pages/user/PaymentResultPage';
// Admin pages
import AdminDashboard from './pages/Admin/Dashboard';
import AdminProducts from './pages/Admin/products/Products';
import { AdminCategories, AdminBrands, AdminAttributes, AdminReturns, AdminShipments } from './pages/Admin/products/CatBrandReturns';
import AdminOrders from './pages/Admin/orders/Orders';
import AdminCustomers from './pages/Admin/customers/Customers';
import AdminVouchers from './pages/Admin/vouchers/Vouchers';
import { AdminWarehouses, AdminLocations, AdminStock } from './pages/Admin/warehouse/Warehouse';
import { AdminStaff, AdminUsers, AdminSuppliers } from './pages/Admin/staff/StaffPages';
import AdminImportOrder from './pages/Admin/orders/ImportOrder';
import { ContactPage } from './pages/user/ContactPage';
import { ProfilePage } from './pages/user/ProfilePage';
import { ChangePasswordPage } from './pages/user/ChangePasswordPage';


// ── Guards ────────────────────────────────────────────────────────────────────
function RequireAuth({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'Customer') return <Navigate to="/" replace />;
  return children;
}

// ── Admin wrapper ─────────────────────────────────────────────────────────────
function AdminPage({ children }) {
  return (
    <RequireAdmin>
      <AdminLayout>{children}</AdminLayout>
    </RequireAdmin>
  );
}

// ── User wrapper ──────────────────────────────────────────────────────────────
function UserPage({ children }) {
  return <UserLayout>{children}</UserLayout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Toast />
          <Routes>
            {/* ── Public Auth ──────────────────────────────────────────── */}
            <Route path="/login"           element={<LoginPage />} />
            <Route path="/register"        element={<RegisterPage />} />
            <Route path="/verify-otp"      element={<VerifyOtpPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* ── User / Shop ──────────────────────────────────────────── */}
            <Route path="/"            element={<UserPage><HomePage /></UserPage>} />
            <Route path="/products"    element={<UserPage><HomePage /></UserPage>} />
            <Route path="/products/:id" element={<UserPage><ProductDetailPage /></UserPage>} />
            <Route path="/cart"        element={<RequireAuth><UserPage><CartPage /></UserPage></RequireAuth>} />
            <Route path="/checkout"    element={<RequireAuth><UserPage><CheckoutPage /></UserPage></RequireAuth>} />
            <Route path="/orders"      element={<RequireAuth><UserPage><MyOrdersPage /></UserPage></RequireAuth>} />

            {/* ── Payment result ─────────────────────────────────────── */}
            <Route path="/payment/result" element={<PaymentResultPage />} />

            {/* ── Admin ────────────────────────────────────────────────── */}
            <Route path="/admin"               element={<AdminPage><AdminDashboard /></AdminPage>} />
            <Route path="/admin/products"      element={<AdminPage><AdminProducts /></AdminPage>} />
            <Route path="/admin/categories"    element={<AdminPage><AdminCategories /></AdminPage>} />
            <Route path="/admin/brands"        element={<AdminPage><AdminBrands /></AdminPage>} />
            <Route path="/admin/attributes"    element={<AdminPage><AdminAttributes /></AdminPage>} />
            <Route path="/admin/orders"        element={<AdminPage><AdminOrders /></AdminPage>} />
            <Route path="/admin/shipments"     element={<AdminPage><AdminShipments /></AdminPage>} />
            <Route path="/admin/returns"       element={<AdminPage><AdminReturns /></AdminPage>} />
            <Route path="/admin/customers"     element={<AdminPage><AdminCustomers /></AdminPage>} />
            <Route path="/admin/vouchers"      element={<AdminPage><AdminVouchers /></AdminPage>} />
            <Route path="/admin/warehouses"    element={<AdminPage><AdminWarehouses /></AdminPage>} />
            <Route path="/admin/locations"     element={<AdminPage><AdminLocations /></AdminPage>} />
            <Route path="/admin/stock"         element={<AdminPage><AdminStock /></AdminPage>} />
            <Route path="/admin/staff"         element={<AdminPage><AdminStaff /></AdminPage>} />
            <Route path="/admin/users"         element={<AdminPage><AdminUsers /></AdminPage>} />
            <Route path="/admin/suppliers"     element={<AdminPage><AdminSuppliers /></AdminPage>} />
            <Route path="/admin/import-orders" element={<AdminPage><AdminImportOrder /></AdminPage>} />
            <Route path="/categories" element={<UserPage><CategoryPage /></UserPage>} />
            <Route path="/categories/:id" element={<UserPage><CategoryPage /></UserPage>} />
            <Route path="/brands" element={<UserPage><BrandPage /></UserPage>} />
            <Route path="/brands/:id" element={<UserPage><BrandPage /></UserPage>} />
            <Route path="/contact" element={<UserPage><ContactPage /></UserPage>} />
            <Route path="/profile" element={<RequireAuth><UserPage><ProfilePage /></UserPage></RequireAuth>} />
            <Route path="/change-password" element={<RequireAuth><UserPage><ChangePasswordPage /></UserPage></RequireAuth>} />
            {/* ── Fallback ─────────────────────────────────────────────── */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}