import React from 'react';

export function Footer() {
  return (
    <footer className="bg-gray-800 text-white py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-bold mb-4">DA_WEB</h3>
            <p className="text-gray-300 text-sm">
              Cửa hàng trực tuyến chất lượng cao với đa dạng sản phẩm.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Liên kết</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/" className="text-gray-300 hover:text-white">Trang chủ</a></li>
              <li><a href="/products" className="text-gray-300 hover:text-white">Sản phẩm</a></li>
              <li><a href="/cart" className="text-gray-300 hover:text-white">Giỏ hàng</a></li>
              <li><a href="/orders" className="text-gray-300 hover:text-white">Đơn hàng</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Hỗ trợ</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-gray-300 hover:text-white">FAQ</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white">Chính sách đổi trả</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white">Liên hệ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Theo dõi</h4>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-300 hover:text-white">Facebook</a>
              <a href="#" className="text-gray-300 hover:text-white">Instagram</a>
              <a href="#" className="text-gray-300 hover:text-white">Twitter</a>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-300">
          <p>&copy; 2026 DA_WEB. Tất cả quyền được bảo lưu.</p>
        </div>
      </div>
    </footer>
  );
}