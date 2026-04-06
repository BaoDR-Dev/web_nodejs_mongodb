import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const menu = [
  { group: 'Tổng quan', items: [
    { path: '/admin', icon: '📊', label: 'Dashboard' },
  ]},
  { group: 'Sản phẩm', items: [
    { path: '/admin/products',   icon: '👕', label: 'Sản phẩm' },
    { path: '/admin/categories', icon: '🗂️', label: 'Danh mục' },
    { path: '/admin/brands',     icon: '🏷️', label: 'Thương hiệu' },
    { path: '/admin/attributes', icon: '🎨', label: 'Thuộc tính' },
  ]},
  { group: 'Đơn hàng', items: [
    { path: '/admin/import-orders', icon: '📥', label: 'Nhập kho' },
    { path: '/admin/orders',    icon: '📦', label: 'Đơn hàng' },
    { path: '/admin/shipments', icon: '🚚', label: 'Vận chuyển' },
    { path: '/admin/carriers',  icon: '🏢', label: 'Đơn vị vận chuyển' },
    { path: '/admin/returns',   icon: '↩️', label: 'Đổi trả' },
  ]},
  { group: 'Kho hàng', items: [
    { path: '/admin/warehouses',    icon: '🏭', label: 'Kho hàng' },
    { path: '/admin/locations',     icon: '📍', label: 'Kệ hàng' },
    { path: '/admin/stock',         icon: '📈', label: 'Biến động kho' },
    { path: '/admin/suppliers',     icon: '🤝', label: 'Nhà cung cấp' },
  ]},
  { group: 'Khách hàng', items: [
    { path: '/admin/customers', icon: '👥', label: 'Khách hàng' },
    { path: '/admin/reviews',   icon: '⭐', label: 'Đánh giá' },
    { path: '/admin/vouchers',  icon: '🎟️', label: 'Voucher' },
  ]},
  { group: 'Nhân sự', items: [
    { path: '/admin/staff', icon: '👤', label: 'Nhân viên' },
    { path: '/admin/users', icon: '🔑', label: 'Tài khoản' },
    { path: '/admin/roles', icon: '🛡️', label: 'Phân quyền' },
  ]},
];

export default function AdminLayout({ children }) {
  const { user, logout, isAdmin, isAdminOrManager } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-60'} bg-gray-900 text-white flex flex-col transition-all duration-200 flex-shrink-0`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-gray-800">
          <span className="text-xl">👗</span>
          {!collapsed && <span className="font-bold text-sm tracking-wide">Fashion Admin</span>}
          <button onClick={() => setCollapsed(!collapsed)} className="ml-auto text-gray-400 hover:text-white text-xs">
            {collapsed ? '▶' : '◀'}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 scrollbar-hide">
          {menu.map(g => (
            <div key={g.group} className="mb-1">
              {!collapsed && (
                <p className="px-4 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">{g.group}</p>
              )}
              {g.items.map(item => {
                const active = location.pathname === item.path;
                return (
                  <Link key={item.path} to={item.path}
                    className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-colors ${active ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                    <span className="text-base flex-shrink-0">{item.icon}</span>
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-gray-800 p-3">
          {!collapsed && (
            <div className="mb-2 px-1">
              <p className="text-xs font-medium text-white truncate">{user?.username}</p>
              <p className="text-[10px] text-gray-500">{user?.role}</p>
            </div>
          )}
          <button onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-800 text-sm transition-colors">
            <span>🚪</span>
            {!collapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center px-6 gap-4 flex-shrink-0">
          <h1 className="text-sm font-semibold text-gray-800 flex-1">
            {menu.flatMap(g => g.items).find(i => i.path === location.pathname)?.label || 'Dashboard'}
          </h1>
          <Link to="/" className="text-xs text-blue-600 hover:underline">← Về cửa hàng</Link>
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
            {user?.username?.[0]?.toUpperCase()}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
