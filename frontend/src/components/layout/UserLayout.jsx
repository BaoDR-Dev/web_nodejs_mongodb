import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import Chatbot from '../Common/Chatbot';
import { Footer } from './Footer';

export default function UserLayout({ children }) {
  const { user, logout, isCustomer } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  
  // KHÔI PHỤC STATE NÀY ĐỂ HẾT LỖI
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="text-2xl font-black italic tracking-tighter">MONALIS</Link>
          
          <div className="hidden md:flex gap-10 font-bold text-sm tracking-wide text-gray-800">
            <Link to="/" className="hover:text-blue-600 transition">Trang chủ</Link>
            <Link to="/products" className="hover:text-blue-600 transition">Sản phẩm</Link>
            <Link to="/categories" className="hover:text-blue-600 transition">Danh mục</Link>
            <Link to="/brands" className="hover:text-blue-600 transition">Thương hiệu</Link>
            <Link to="/contact" className="hover:text-blue-600 transition">Liên hệ</Link>
          </div>

          <div className="flex items-center gap-6">
            {/* Giỏ hàng */}
            <Link to="/cart" className="relative p-2 hover:bg-gray-100 rounded-full transition">
              <span className="text-2xl">🛍️</span>
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 bg-black text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Tài khoản */}
            {user ? (
              <div className="relative">
                <button 
                  onClick={() => setMenuOpen(!menuOpen)} 
                  className="flex items-center gap-2 bg-gray-100 py-2 px-4 rounded-full hover:bg-gray-200 transition"
                >
                  <span className="text-sm font-bold">{user.username}</span>
                </button>
                
                {menuOpen && (
                  <div className="absolute right-0 top-14 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in duration-200">
                    <Link to="/profile" className="block px-4 py-3 text-sm font-medium hover:bg-gray-50">Thông tin tài khoản</Link>
                    <Link to="/orders" className="block px-4 py-3 text-sm font-medium hover:bg-gray-50">Danh sách đơn hàng</Link>
                    <Link to="/notifications" className="block px-4 py-3 text-sm font-medium hover:bg-gray-50">Thông báo</Link>
                    {user.role !== 'Customer' && (
                      <Link to="/admin" className="block px-4 py-3 text-sm font-bold text-blue-600 hover:bg-blue-50">Admin Panel</Link>
                    )}
                    <hr className="my-1" />
                    <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50">Đăng xuất</button>
                  </div>
                )}{menuOpen && (
                  <div className="absolute right-0 top-14 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                    <Link to="/profile" className="block px-4 py-3 text-sm font-medium hover:bg-gray-50">Thông tin tài khoản</Link>
                    <Link to="/orders" className="block px-4 py-3 text-sm font-medium hover:bg-gray-50">Đơn hàng của tôi</Link>
                    <Link to="/change-password" className="block px-4 py-3 text-sm font-medium hover:bg-gray-50">Đổi mật khẩu</Link>
                    {user.role !== 'Customer' && (
                      <Link to="/admin" className="block px-4 py-3 text-sm font-bold text-blue-600 hover:bg-blue-50">Admin Panel</Link>
                    )}
                    <hr className="my-1" />
                    <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50">Đăng xuất</button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="text-sm font-bold border-b-2 border-black">Đăng nhập</Link>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-10">{children}</main>

      <Footer />
      <Chatbot />
    </div>
  );
}