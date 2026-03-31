import React, { useState, useEffect, useCallback } from 'react';
import { productAPI, categoryAPI } from '../../../api/services';
import { PageLoader, Pagination } from '../../../components/Common/UI';
import { toast } from '../../../components/Common/Toast';
import { ProductCard } from './components/ProductCard';

export function HomePage() {
  const [products, setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [catId, setCatId]         = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await productAPI.getAll({ page, limit: 16, name: search || undefined, category_id: catId || undefined });
      setProducts(data.data || []);
      setTotal(data.total || 0);
    } catch { toast.error('Lỗi tải sản phẩm'); }
    finally { setLoading(false); }
  }, [page, search, catId]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => {
    categoryAPI.getAll().then(r => setCategories(r.data.data || [])).catch(() => {});
  }, []);

  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 mb-8 text-white">
        <p className="text-sm font-medium opacity-80 mb-2">Fashion Store</p>
        <h1 className="text-3xl font-bold mb-3">Thời trang phong cách</h1>
        <p className="opacity-80 text-sm">Khám phá hàng ngàn sản phẩm thời trang chất lượng</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (setPage(1), fetch())}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Tìm kiếm sản phẩm..." />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          <button onClick={() => { setCatId(''); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap ${!catId ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            Tất cả
          </button>
          {categories.map(c => (
            <button key={c._id} onClick={() => { setCatId(c._id); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap ${catId === c._id ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? <PageLoader /> : (
        <>
          {products.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-4xl mb-3">😕</p>
              <p>Không tìm thấy sản phẩm</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map(p => <ProductCard key={p._id} product={p} />)}
            </div>
          )}
          <Pagination page={page} total={total} limit={16} onChange={setPage} />
        </>
      )}
    </div>
  );
}
