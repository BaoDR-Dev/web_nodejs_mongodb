import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderAPI, customerAPI, productAPI, supplierAPI } from '../../api/services';
import { StatCard, fmtVND, fmtDate, Badge, statusColor } from '../../components/Common/UI';

export default function AdminDashboard() {
  const [stats, setStats]     = useState({});
  const [orders, setOrders]   = useState([]);
  const [revenue, setRevenue] = useState({ total_revenue: 0, total_orders: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [ordersRes, revenueRes, customersRes, productsRes] = await Promise.allSettled([
          orderAPI.getAll({ page: 1, limit: 5, order_type: 'OUT' }),
          orderAPI.revenueStats({}),
          customerAPI.getAll({ limit: 1 }),
          productAPI.getAll({ limit: 1 }),
        ]);
        if (ordersRes.status === 'fulfilled')   setOrders(ordersRes.value.data.data || []);
        if (revenueRes.status === 'fulfilled')  setRevenue(revenueRes.value.data.data || {});
        if (customersRes.status === 'fulfilled') setStats(s => ({ ...s, customers: customersRes.value.data.total }));
        if (productsRes.status === 'fulfilled')  setStats(s => ({ ...s, products: productsRes.value.data.total }));
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Tổng quan</h2>
        <p className="text-sm text-gray-500 mt-1">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="💰" label="Doanh thu" value={fmtVND(revenue.total_revenue)} color="green" sub="Đơn đã hoàn tất" />
        <StatCard icon="📦" label="Tổng đơn hàng" value={revenue.total_orders || 0} color="blue" />
        <StatCard icon="👥" label="Khách hàng" value={stats.customers || 0} color="purple" />
        <StatCard icon="👕" label="Sản phẩm" value={stats.products || 0} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent orders */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-gray-50">
            <h3 className="font-semibold text-gray-800">Đơn hàng mới</h3>
            <Link to="/admin/orders" className="text-xs text-blue-600 hover:underline">Xem tất cả →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {orders.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">Chưa có đơn hàng</p>
            ) : orders.map(o => (
              <div key={o._id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">#{o._id.slice(-8)}</p>
                  <p className="text-xs text-gray-500">{o.customer_id?.full_name || o.user_id?.username} · {fmtDate(o.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{fmtVND(o.total_price)}</p>
                  <Badge color={statusColor(o.status)}>{o.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b border-gray-50">
            <h3 className="font-semibold text-gray-800">Thao tác nhanh</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 p-5">
            {[
              { to: '/admin/products', icon: '👕', label: 'Thêm sản phẩm' },
              { to: '/admin/orders',   icon: '📦', label: 'Xem đơn hàng' },
              { to: '/admin/vouchers', icon: '🎟️', label: 'Tạo voucher' },
              { to: '/admin/stock',    icon: '📈', label: 'Nhập kho' },
              { to: '/admin/customers',icon: '👥', label: 'Khách hàng' },
              { to: '/admin/suppliers',icon: '🤝', label: 'Nhà cung cấp' },
            ].map(item => (
              <Link key={item.to} to={item.to}
                className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:border-blue-200 hover:bg-blue-50 transition-colors group">
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm text-gray-700 group-hover:text-blue-700 font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
