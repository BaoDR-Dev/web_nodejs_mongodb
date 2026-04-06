// src/pages/user/HomePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { productAPI, categoryAPI, voucherAPI } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import { ProductCard } from './components/ProductCard';
import { PageLoader, fmtVND } from '../../components/Common/UI';

export function HomePage() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState('all');

  const checkIsVoucherUsed = (voucher) => {
    if (!user || (!user._id && !user.id) || !voucher.used_by) return false;
    const userId = user._id || user.id;
    return voucher.used_by.some(uid => {
      const idStr = typeof uid === 'object' ? uid._id : uid;
      return String(idStr) === String(userId);
    });
  };

  const fetchProducts = useCallback(async (catId) => {
    setLoading(true);
    try {
      const params = catId !== 'all' ? { category_id: catId, limit: 8 } : { limit: 8 };
      const { data } = await productAPI.getAll(params);
      setProducts(data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    // Lấy 6 danh mục đầu tiên
    categoryAPI.getAll().then(r => {
      const cats = r.data.data.slice(0, 6);
      setCategories(cats);
      if (cats.length > 0) {
        setActiveCat(cats[0]._id);
        fetchProducts(cats[0]._id);
      }
    });
    // Lấy 3 voucher mới nhất
 voucherAPI.getAll({ limit: 3 })
      .then(r => setVouchers(r.data.data || []))
      .catch(err => console.log("Không có quyền xem voucher, bỏ qua..."));  }, [fetchProducts]);

  return (
    <div className="space-y-16 pb-20">
      {/* Slider Banner (Giữ nguyên) */}
      <section className="h-[500px] w-full relative rounded-3xl overflow-hidden shadow-2xl">
        <img src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2000" className="w-full h-full object-cover" alt="Hero" />
        <div className="absolute inset-0 bg-black/30 flex items-center px-16">
            <h1 className="text-white text-7xl font-black italic">MONALIS <br/> FASHION</h1>
        </div>
      </section>

      {/* Voucher Row (3 cái mới nhất) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {vouchers.map(v => {
          const isUsed = checkIsVoucherUsed(v);
          return (
            <div 
              key={v._id} 
              className={`p-6 rounded-3xl text-white shadow-lg relative overflow-hidden transition ${
                isUsed 
                  ? 'bg-gray-400' 
                  : 'bg-gradient-to-br from-blue-600 to-indigo-700'
              }`}
            >
              {isUsed && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <span className="text-2xl font-black text-white">ĐÃ DÙNG</span>
                </div>
              )}
              <span className="text-xs font-bold uppercase tracking-widest opacity-70">Voucher</span>
              <h4 className="text-2xl font-black mt-1 mb-2">{v.code}</h4>
              <p className="text-sm opacity-90">{v.description || "Giảm giá đặc biệt cho bạn"}</p>
            </div>
          );
        })}
      </section>

      {/* Category Tabs & Products */}
      <section>
        <div className="flex gap-4 mb-10 overflow-x-auto pb-2">
            {/* <button onClick={() => { setActiveCat('all'); fetchProducts('all'); }} 
              className={`px-8 py-3 rounded-full font-bold transition ${activeCat === 'all' ? 'bg-black text-white' : 'bg-gray-100'}`}>Tất cả</button> */}
            {categories.map(c => (
              <button key={c._id} onClick={() => { setActiveCat(c._id); fetchProducts(c._id); }}
                className={`px-8 py-3 rounded-full font-bold transition ${activeCat === c._id ? 'bg-black text-white' : 'bg-gray-100'}`}>
                {c.name}
              </button>
            ))}
        </div>
        
        {loading ? <PageLoader /> : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {products.map(p => <ProductCard key={p._id} product={p} />)}
            </div>
        )}
      </section>

      {/* Banner 3 cột thay vì chỉ là màu */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 h-80">
        <div className="relative rounded-[2rem] overflow-hidden group">
            <img src="https://images.unsplash.com/photo-1523381210434-271e8be1f52b" className="w-full h-full object-cover group-hover:scale-105 transition duration-700" alt="Mua 1 tặng 1"/>
            <div className="absolute inset-0 bg-black/40 p-8 flex flex-col justify-end text-white">
                <h4 className="font-black text-2xl">MUA 1 TẶNG 1</h4>
            </div>
        </div>
        <div className="relative rounded-[2rem] overflow-hidden group">
            <img src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d" className="w-full h-full object-cover group-hover:scale-105 transition duration-700" alt="Sale 50"/>
            <div className="absolute inset-0 bg-black/40 p-8 flex flex-col justify-end text-white">
                <h4 className="font-black text-2xl">SALE OFF 50%</h4>
            </div>
        </div>
        <div className="relative rounded-[2rem] overflow-hidden group">
            <img src="https://images.unsplash.com/photo-1469334031218-e382a71b716b" className="w-full h-full object-cover group-hover:scale-105 transition duration-700" alt="Mới về"/>
            <div className="absolute inset-0 bg-black/40 p-8 flex flex-col justify-end text-white">
                <h4 className="font-black text-2xl">MỚI CẬP NHẬT</h4>
            </div>
        </div>
      </section>
    </div>
  );
}