import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orderAPI } from '../../../api/services';
import { Modal, Badge, fmtVND, fmtDate, PageLoader } from '../../../components/Common/UI';
import { toast } from '../../../components/Common/Toast';

export function MyOrdersPage() {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [tab, setTab]         = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await orderAPI.myOrders({ status: tab || undefined, limit: 50 });
        setOrders(data.data || []);
      } catch { toast.error('Lỗi tải đơn hàng'); }
      finally { setLoading(false); }
    };
    load();
  }, [tab]);

  const statusColor = { Draft: 'amber', Completed: 'green', Cancelled: 'red' };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Đơn hàng của tôi</h1>

      <div className="flex gap-2 mb-5 overflow-x-auto">
        {[{ v: '', l: 'Tất cả' }, { v: 'Draft', l: 'Đang xử lý' }, { v: 'Completed', l: 'Hoàn tất' }, { v: 'Cancelled', l: 'Đã hủy' }].map(t => (
          <button key={t.v} onClick={() => setTab(t.v)}
            className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap ${tab === t.v ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {loading ? <PageLoader /> : orders.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">📦</p>
          <p>Chưa có đơn hàng</p>
          <Link to="/" className="inline-block mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl text-sm">Mua sắm ngay</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <div key={o._id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs text-gray-400">#{o._id.slice(-10)}</span>
                <div className="flex items-center gap-3">
                  <Badge color={statusColor[o.status]}>{o.status}</Badge>
                  <span className="text-xs text-gray-400">{fmtDate(o.createdAt)}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {o.details?.slice(0, 3).map((d, i) => (
                  <span key={i} className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-lg">
                    {d.variant_id?.product_id?.name || d.variant_id?.sku} × {d.quantity}
                  </span>
                ))}
                {o.details?.length > 3 && <span className="text-xs text-gray-400">+{o.details.length - 3} sản phẩm</span>}
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-600">{fmtVND(o.total_price)}</span>
                <button onClick={() => { setSelected(o); setShowDetail(true); }}
                  className="text-xs text-blue-600 hover:underline">Xem chi tiết →</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <Modal open={showDetail} onClose={() => setShowDetail(false)} title={`Đơn hàng #${selected?._id?.slice(-10)}`} size="lg">
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center">
              <Badge color={statusColor[selected.status]}>{selected.status}</Badge>
              <span className="text-gray-500">{fmtDate(selected.createdAt)}</span>
            </div>
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 text-xs">
                  <tr><th className="px-3 py-2 text-left">Sản phẩm</th><th className="px-3 py-2 text-center">SL</th><th className="px-3 py-2 text-right">T.Tiền</th></tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {selected.details?.map((d, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{d.variant_id?.product_id?.name || d.variant_id?.sku}</td>
                      <td className="px-3 py-2 text-center">{d.quantity}</td>
                      <td className="px-3 py-2 text-right font-semibold">{fmtVND(d.unit_price * d.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
              {selected.discount_amount > 0 && <div className="flex justify-between text-green-600"><span>Giảm giá</span><span>-{fmtVND(selected.discount_amount)}</span></div>}
              <div className="flex justify-between font-bold text-base"><span>Tổng thanh toán</span><span className="text-blue-600">{fmtVND(selected.total_price)}</span></div>
              <div className="flex justify-between text-gray-500 text-xs"><span>Phương thức</span><span>{selected.payments?.[0]?.method || '—'}</span></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
