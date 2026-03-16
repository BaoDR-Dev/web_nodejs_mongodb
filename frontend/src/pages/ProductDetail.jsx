import React, { useState, useEffect } from 'react';

const ProductDetail = ({ product }) => {
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [currentVariant, setCurrentVariant] = useState(null);

  // Tìm variant khớp với Color và Size đã chọn
  useEffect(() => {
    const match = product.variants?.find(v => 
      v.color_id?._id === selectedColor && v.size_id?._id === selectedSize
    );
    setCurrentVariant(match);
  }, [selectedColor, selectedSize]);

  return (
    <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-12">
      {/* Cột trái: Gallery Ảnh */}
      <div className="space-y-4">
        <img 
          src={currentVariant?.images?.[0]?.image_url || product.variants[0].images[0].image_url} 
          className="w-full rounded-3xl border shadow-sm" 
          alt="Product"
        />
      </div>

      {/* Cột phải: Thông tin & Lựa chọn */}
      <div className="space-y-6">
        <h1 className="text-3xl font-extrabold text-gray-900">{product.name}</h1>
        
        {/* Chọn Màu */}
        <div>
          <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Màu sắc</span>
          <div className="flex gap-3 mt-2">
            {[...new Set(product.variants.map(v => v.color_id))].map(color => (
              <button 
                key={color._id}
                onClick={() => setSelectedColor(color._id)}
                className={`px-4 py-2 border-2 rounded-lg transition-all ${selectedColor === color._id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
              >
                {color.color_name}
              </button>
            ))}
          </div>
        </div>

        {/* Chọn Size */}
        <div>
          <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Kích thước</span>
          <div className="flex gap-3 mt-2">
            {[...new Set(product.variants.map(v => v.size_id))].map(size => (
              <button 
                key={size._id}
                onClick={() => setSelectedSize(size._id)}
                className={`w-12 h-12 flex items-center justify-center border-2 rounded-lg transition-all ${selectedSize === size._id ? 'border-black bg-black text-white' : 'border-gray-200'}`}
              >
                {size.size_name}
              </button>
            ))}
          </div>
        </div>

        {/* Hiển thị giá & Trạng thái kho */}
        <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="text-4xl font-black text-blue-600 mb-2">
            {currentVariant ? `${new Intl.NumberFormat('vi-VN').format(currentVariant.price)} ₫` : "Vui lòng chọn biến thể"}
          </div>
          {currentVariant && (
            <div className="text-sm text-gray-600">
              {currentVariant.stock_quantity > 0 
                ? `✅ Còn hàng (${currentVariant.stock_quantity} sản phẩm tại kho)` 
                : "❌ Hết hàng tại vị trí này"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};