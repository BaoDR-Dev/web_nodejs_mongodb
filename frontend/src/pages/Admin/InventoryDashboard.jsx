import React from 'react';

const InventoryDashboard = ({ inventoryData }) => {
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">Quản lý kho chi tiết</h2>
        <button className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium">+ Nhập kho (IN)</button>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-semibold text-gray-600">Sản phẩm (SKU)</th>
              <th className="p-4 font-semibold text-gray-600">Kho / Vị trí</th>
              <th className="p-4 font-semibold text-gray-600 text-center">Số lượng hiện tại</th>
              <th className="p-4 font-semibold text-gray-600">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {inventoryData.map((item) => (
              <tr key={item._id} className="border-b hover:bg-gray-50">
                <td className="p-4">
                  <div className="font-bold">{item.variant_id?.sku}</div>
                  <div className="text-xs text-gray-500">{item.variant_id?.product_id?.name}</div>
                </td>
                <td className="p-4">
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold mr-2">
                    {item.location_id?.warehouse_id?.name}
                  </span>
                  {item.location_id?.shelf_name}
                </td>
                <td className="p-4 text-center font-mono font-bold">{item.quantity}</td>
                <td className="p-4">
                  {item.quantity < 10 ? (
                    <span className="text-red-500 text-xs font-bold animate-pulse">⚠️ Cần nhập thêm</span>
                  ) : (
                    <span className="text-green-500 text-xs font-bold">An toàn</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};