// src/pages/user/CategoryPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { productAPI, categoryAPI } from '../../api/services';
import { ProductCard } from './components/ProductCard';
import { Pagination, PageLoader } from '../../components/Common/UI';

export function CategoryPage() {
  const { id } = useParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    categoryAPI.getAll().then(r => setCategories(r.data.data));
    productAPI.getAll({ category_id: id, page, limit: 12 }).then(r => {
      setProducts(r.data.data);
      setTotal(r.data.total);
      setLoading(false);
    });
  }, [id, page]);

  return (
    <div className="flex gap-8 pt-8">
      {/* Sidebar: Danh sách danh mục */}
      <aside className="w-64 flex-shrink-0">
        <h3 className="font-bold mb-4 uppercase">Danh mục</h3>
        <ul className="space-y-2">
            {/* Nút Tất cả danh mục */}
            <li>
                <Link 
                to="/products" 
                className={`block p-2 rounded-lg ${!id ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}
                >
                Tất cả sản phẩm
                </Link>
            </li>

            {/* Danh sách danh mục từ API */}
            {categories.map(c => (
                <li key={c._id}>
                <Link 
                    to={`/categories/${c._id}`} 
                    className={`block p-2 rounded-lg ${id === c._id ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}
                >
                    {c.name}
                </Link>
                </li>
            ))}
        </ul>
      </aside>

      {/* Product List */}
      <main className="flex-1">
        {loading ? <PageLoader /> : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {products.map(p => <ProductCard key={p._id} product={p} />)}
            </div>
            <Pagination page={page} total={total} limit={12} onChange={setPage} />
          </>
        )}
      </main>
    </div>
  );
}