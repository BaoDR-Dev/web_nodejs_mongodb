import React, { useState, useEffect } from 'react';

const resolveImageUrl = (url) => {
    if (!url) return 'https://via.placeholder.com/300';
    if (url.startsWith('http')) return url;
    return `http://localhost:5000/uploads/${url}`;
};

const ProductCard = ({ product }) => {
  const [activeVariant, setActiveVariant] = useState(product.variants?.[0] || {});

  useEffect(() => {
    if (product.variants?.length > 0) setActiveVariant(product.variants[0]);
  }, [product]);

  const formatVND = (price) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  return (
    // Thay đổi 1: Bo góc lớn hơn (rounded-3xl), bỏ border, thêm shadow-sm và transition mượt
    <div className="bg-white rounded-3xl shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col h-full group overflow-hidden">
      
      {/* KHU VỰC HÌNH ẢNH - Tỷ lệ 3:4 chuẩn thời trang */}
      <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
        <img
            src={resolveImageUrl(activeVariant.images?.[0]?.image_url)}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
        />
        
        {/* Nhãn hết hàng tinh tế hơn */}
        {activeVariant.stock_quantity <= 0 && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-[1px]">
            <span className="text-black font-black uppercase tracking-widest text-xs border-2 border-black px-4 py-1">Hết hàng</span>
          </div>
        )}
      </div>

      {/* THÔNG TIN SẢN PHẨM */}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
             {product.brand_id?.name || 'Fashion'}
           </span>
        </div>

        <h3 className="font-bold text-gray-900 text-lg leading-tight mb-2 group-hover:text-blue-600 transition">
          {product.name}
        </h3>

        <p className="text-blue-600 font-black text-xl mb-4">
          {formatVND(activeVariant.price || 0)}
        </p>

        {/* CHỌN BIẾN THỂ (MÀU SẮC) - Nhỏ gọn, sang trọng */}
        <div className="flex gap-2 mb-6">
          {product.variants?.map((v) => (
            <button
              key={v._id}
              onClick={() => setActiveVariant(v)}
              className={`w-6 h-6 rounded-full border border-gray-200 ring-2 ring-offset-2 transition-all ${
                activeVariant._id === v._id ? 'ring-black' : 'ring-transparent'
              }`}
              style={{ backgroundColor: v.color_id?.hex_code || '#e5e7eb' }}
            />
          ))}
        </div>

        {/* NÚT HÀNH ĐỘNG - Chỉ hiện khi hover để card nhìn sạch sẽ */}
        <button 
          disabled={activeVariant.stock_quantity <= 0}
          className="mt-auto w-full py-3 bg-gray-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-[0.98]"
        >
          {activeVariant.stock_quantity > 0 ? 'Thêm vào giỏ' : 'Hết hàng'}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;