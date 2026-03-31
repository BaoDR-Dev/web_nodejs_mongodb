import React from 'react';
import { Link } from 'react-router-dom';
import { cartAPI } from '../../../api/services';
import { toast } from '../../../components/Common/Toast';
import { fmtVND } from '../../../components/Common/UI';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '../../../context/AuthContext';

export function ProductCard({ product }) {
  const { isCustomer } = useAuth();
  const { fetchCount } = useCart();
  const variant = product.variants?.[0];
  const image   = variant?.images?.find(i => i.is_primary)?.image_url || variant?.images?.[0]?.image_url;

  const addToCart = async (e) => {
    e.preventDefault();
    if (!isCustomer) { toast.info('Vui lòng đăng nhập để mua hàng'); return; }
    if (!variant) { toast.error('Sản phẩm chưa có biến thể'); return; }
    try {
      await cartAPI.add({ variant_id: variant._id, quantity: 1 });
      toast.success('Đã thêm vào giỏ!');
      fetchCount();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
  };

  return (
    <Link to={`/products/${product._id}`} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5">
      <div className="aspect-square bg-gray-50 overflow-hidden">
        {image ? (
          <img src={image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-gray-200">👕</div>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs text-gray-400 mb-1">{product.brand_id?.brand_name}</p>
        <p className="font-semibold text-gray-800 text-sm leading-snug mb-2 line-clamp-2">{product.name}</p>
        <div className="flex items-center justify-between">
          <span className="font-bold text-blue-600">{variant ? fmtVND(variant.price) : 'Liên hệ'}</span>
          <button onClick={addToCart} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition">
            + Giỏ
          </button>
        </div>
      </div>
    </Link>
  );
}
