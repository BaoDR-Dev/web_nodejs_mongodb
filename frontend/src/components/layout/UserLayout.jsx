import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

export default function UserLayout({ children }) {
  const { user, logout, isCustomer } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-6">
          <Link to="/" className="font-bold text-lg text-gray-900 tracking-tight">👗 Fashion</Link>

          <div className="hidden md:flex items-center gap-6 flex-1">
            <Link to="/products" className="text-sm text-gray-600 hover:text-gray-900">Sản phẩm</Link>
            <Link to="/categories" className="text-sm text-gray-600 hover:text-gray-900">Danh mục</Link>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {isCustomer && (
              <Link to="/cart" className="relative text-gray-600 hover:text-gray-900">
                <span className="text-xl">🛒</span>
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>
            )}

            {user ? (
              <div className="relative">
                <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
                    {user.username?.[0]?.toUpperCase()}
                  </div>
                  <span className="hidden sm:block max-w-24 truncate">{user.username}</span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-10 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50" onMouseLeave={() => setMenuOpen(false)}>
                    <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Tài khoản</Link>
                    <Link to="/orders" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Đơn hàng</Link>
                    <Link to="/notifications" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Thông báo</Link>
                    {user.role !== 'Customer' && (
                      <Link to="/admin" className="block px-4 py-2 text-sm text-blue-600 hover:bg-gray-50">Quản trị</Link>
                    )}
                    <hr className="my-1" />
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-50">Đăng xuất</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100">Đăng nhập</Link>
                <Link to="/register" className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">Đăng ký</Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>

      <footer className="bg-white border-t border-gray-100 mt-12 py-8 text-center text-sm text-gray-400">
        © 2025 Fashion Store
      </footer>
    </div>
  );
}
