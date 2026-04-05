// src/pages/user/BrandPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { productAPI, brandAPI } from '../../api/services';
import { ProductCard } from './components/ProductCard';
import { Pagination, PageLoader } from '../../components/Common/UI';

export function BrandPage() {
  const { id } = useParams();
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Lấy danh sách brand và info brand (nếu có id)
  useEffect(() => {
    brandAPI.getAll()
      .then(r => {
        console.log('Brands response:', r);
        const brandData = r.data?.data || r.data || [];
        setBrands(Array.isArray(brandData) ? brandData : []);
        
        // Nếu có id, lấy thông tin brand
        if (id) {
          const found = (Array.isArray(brandData) ? brandData : []).find(b => b._id === id);
          setSelectedBrand(found || null);
        }
      })
      .catch(err => {
        console.error('Error loading brands:', err);
        setBrands([]);
      });
  }, [id]);

  // Lấy sản phẩm theo brand
  useEffect(() => {
    setLoading(true);
    if (id) {
      productAPI.getAll({ brand: id, page, limit: 12 }).then(r => {
        setProducts(r.data.data);
        setTotal(r.data.total);
        setLoading(false);
      }).catch(err => {
        console.error('Error loading products:', err);
        setLoading(false);
      });
    } else {
      setProducts([]);
      setTotal(0);
      setLoading(false);
    }
  }, [id, page]);

  // Nếu chưa chọn brand, hiển thị danh sách brand
  if (!id) {
    return (
      <div className="pt-8">
        <h2 className="text-3xl font-bold mb-8">Chọn thương hiệu</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {brands.map(b => (
            <Link
              key={b._id}
              to={`/brands/${b._id}`}
              className="p-6 border border-gray-200 rounded-lg hover:shadow-lg hover:border-blue-600 transition text-center"
            >
              <h3 className="font-bold text-lg text-gray-800">{b.name}</h3>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // Nếu đã chọn brand, hiển thị sản phẩm
  return (
    <div>
      <div className="mb-8">
        <Link to="/brands" className="text-blue-600 hover:text-blue-800 font-semibold">← Quay lại</Link>
        <h2 className="text-3xl font-bold mt-4">{selectedBrand?.name || 'Thương hiệu'}</h2>
      </div>

      <main>
        {loading ? <PageLoader /> : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {products.length > 0 ? (
                products.map(p => <ProductCard key={p._id} product={p} />)
              ) : (
                <div className="col-span-3 text-center py-12">
                  <p className="text-gray-500 text-lg">Không có sản phẩm nào</p>
                </div>
              )}
            </div>
            {products.length > 0 && <Pagination page={page} total={total} limit={12} onChange={setPage} />}
          </>
        )}
      </main>
    </div>
  );
}
