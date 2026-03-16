import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ProductCard from './components/Product/ProductCard';

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Gọi API lấy danh sách sản phẩm từ Backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Đường dẫn này sẽ tự động hiểu là http://localhost:5000/api/products 
        // nhờ vào cấu hình "proxy" trong package.json
        const response = await axios.get('/api/products');
        setProducts(response.data.data); // Lưu dữ liệu vào state
        setLoading(false);
      } catch (error) {
        console.error("Lỗi kết nối Backend:", error);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Thanh Điều Hướng (Navbar) */}
      <nav className="bg-white shadow-md p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">SMART WAREHOUSE</h1>
          <div className="space-x-6 font-medium">
            <a href="/" className="hover:text-blue-500">Cửa hàng</a>
            <a href="/admin" className="bg-blue-600 text-white px-4 py-2 rounded-lg">Quản lý kho</a>
          </div>
        </div>
      </nav>

      {/* Nội dung chính */}
      <main className="max-w-7xl mx-auto p-6">
        <h2 className="text-xl font-semibold mb-6 uppercase tracking-wider text-gray-500">
          Danh sách sản phẩm mới nhất
        </h2>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Đang tải dữ liệu từ kho...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.length > 0 ? (
              products.map(item => (
                <ProductCard key={item._id} product={item} />
              ))
            ) : (
              <div className="col-span-full text-center bg-white p-10 rounded-xl border-2 border-dashed">
                Chưa có sản phẩm nào. Hãy dùng Postman để thêm sản phẩm đầu tiên!
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;