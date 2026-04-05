import React, { useState, useEffect } from 'react';
const resolveImageUrl = (url) => {
    if (!url) return 'https://via.placeholder.com/300'; // Ảnh mặc định nếu ko có
    if (url.startsWith('http')) return url; // Link Cloudinary -> Trả về y nguyên
    return `http://localhost:5000/uploads/${url}`; // Link Local cũ -> Nối chuỗi
};
const ProductCard = ({ product }) => {
  // 1. Khởi tạo variant mặc định là cái đầu tiên có trong danh sách
  const [activeVariant, setActiveVariant] = useState(product.variants?.[0] || {});

  // Cập nhật lại activeVariant nếu props product thay đổi
  useEffect(() => {
    if (product.variants?.length > 0) {
      setActiveVariant(product.variants[0]);
    }
  }, [product]);

  // Hàm định dạng tiền tệ
  const formatVND = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 p-4 border border-gray-100 flex flex-col h-full group">
      
      {/* KHU VỰC HÌNH ẢNH */}
      <div className="relative aspect-square mb-4 bg-gray-50 rounded-xl overflow-hidden">
        <img
            src={resolveImageUrl(activeVariant.images?.[0]?.image_url)}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Nhãn hết hàng dựa trên biến thể đang chọn */}
        {activeVariant.stock_quantity <= 0 && (
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-white text-red-600 px-3 py-1 rounded-full font-bold text-sm shadow-lg">
              TẠM HẾT HÀNG
            </span>
          </div>
        )}
      </div>

      {/* THÔNG TIN SẢN PHẨM */}
      <div className="flex-1">
        <div className="flex justify-between items-start mb-1">
           <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
             {product.brand_id?.name || 'Brand'}
           </span>
           <span className="text-[10px] text-gray-400 font-medium">
             {product.category_id?.name}
           </span>
        </div>

        <h3 className="font-bold text-gray-800 text-base leading-snug mb-2 line-clamp-2 h-12">
          {product.name}
        </h3>

        {/* GIÁ THAY ĐỔI THEO BIẾN THỂ */}
        <p className="text-red-600 font-extrabold text-xl mb-3">
          {formatVND(activeVariant.price || 0)}
        </p>

        {/* CHỌN BIẾN THỂ (MÀU SẮC) */}
        <div className="flex flex-wrap gap-2 mb-4">
          {product.variants?.map((v) => (
            <button
              key={v._id}
              onClick={() => setActiveVariant(v)}
              className={`group/btn relative w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${
                activeVariant._id === v._id 
                ? 'border-blue-500 scale-110 shadow-md' 
                : 'border-gray-100 hover:border-gray-300'
              }`}
              title={`${v.color_id?.color_name || 'Màu sắc'} - Size: ${v.size_id?.size_name || '?'}`}
            >
              {/* Vòng tròn màu */}
              <span 
                className="w-5 h-5 rounded-full shadow-inner"
                style={{ backgroundColor: v.color_id?.hex_code || '#e5e7eb' }}
              />
              
              {/* Tooltip hiện số lượng kho khi di chuột vào màu */}
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap">
                Kho: {v.stock_quantity}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* NÚT HÀNH ĐỘNG */}
      <div className="mt-auto space-y-2">
        <div className="flex justify-between text-[11px] text-gray-500 px-1">
          <span>Đơn vị: {product.unit}</span>
          <span>SKU: {activeVariant.sku}</span>
        </div>
        
        <button 
          disabled={activeVariant.stock_quantity <= 0}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-all shadow-sm ${
            activeVariant.stock_quantity > 0 
            ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95' 
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {activeVariant.stock_quantity > 0 ? 'THÊM VÀO GIỎ' : 'HẾT HÀNG'}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;