import React, { useState, useEffect, useCallback } from 'react';
import { orderAPI, shipmentAPI, carrierAPI } from '../../../api/services';
import { Table, Badge, Modal, Field, Input, Select, Pagination, fmtVND, fmtDate, statusColor, PageLoader } from '../../../components/Common/UI';
import { toast } from '../../../components/Common/Toast';

const STATUS_COLORS = { Draft: 'amber', Shipping: 'blue', Completed: 'green', Cancelled: 'red', Returned: 'orange' };
const STATUS_LABELS = { Draft: 'Chờ xử lý', Shipping: 'Đang vận chuyển', Completed: 'Hoàn thành', Cancelled: 'Đã hủy', Returned: 'Đã trả hàng' };

export default function AdminOrders() {
  const [orders, setOrders]     = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState({ status: '', order_type: 'OUT' });
  const [selected, setSelected] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showShipment, setShowShipment] = useState(false);
  const [shipForm, setShipForm] = useState({ carrier_id: '', tracking_code: '', shipping_fee: '', shipping_address: '' });
  const [carriers, setCarriers] = useState([]);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    carrierAPI.getAll().then(r => setCarriers(r.data.data || [])).catch(() => {});
  }, []);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await orderAPI.getAll({ page, limit: 20, ...filter });
      setOrders(data.data || []);
      setTotal(data.total || 0);
    } catch { toast.error('Không tải được đơn hàng'); }
    finally { setLoading(false); }
  }, [page, filter]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleStatus = async (id, status) => {
    setProcessing(true);
    try {
      await orderAPI.updateStatus(id, { status });
      toast.success(`Đơn hàng đã chuyển sang ${STATUS_LABELS[status] || status}`);
      fetch();
      if (showDetail && selected?._id === id) {
        const { data } = await orderAPI.getById(id);
        setSelected(data.data);
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
    finally { setProcessing(false); }
  };

  const handleCreateShipment = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const carrier = carriers.find(c => c._id === shipForm.carrier_id);
      const trackingCode = shipForm.tracking_code ||
        `${carrier?.code || 'VC'}${Date.now().toString().slice(-8)}`;

      await shipmentAPI.create({
        order_id:         selected._id,
        carrier:          carrier?.name || '',
        tracking_code:    trackingCode,
        shipping_fee:     shipForm.shipping_fee,
        shipping_address: shipForm.shipping_address || selected.shipping_address,
      });
      toast.success('Đã tạo vận đơn! Đơn hàng chuyển sang Đang vận chuyển.');
      setShowShipment(false);
      setShipForm({ carrier_id: '', tracking_code: '', shipping_fee: '', shipping_address: '' });
      fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi tạo vận đơn'); }
    finally { setProcessing(false); }
  };

  const openDetail = async (order) => {
    try {
      const { data } = await orderAPI.getById(order._id);
      setSelected(data.data);
      setShowDetail(true);
    } catch { toast.error('Không tải được chi tiết đơn'); }
  };

  const columns = [
    { header: '#', render: r => <span className="font-mono text-xs text-gray-500">{r._id.slice(-8)}</span> },
    { header: 'Khách hàng', render: r => (
      <div>
        <p className="font-medium text-sm">{r.customer_id?.full_name || r.user_id?.username || '—'}</p>
        <p className="text-xs text-gray-400">{r.customer_id?.phone}</p>
      </div>
    )},
    { header: 'Tổng tiền', render: r => <span className="font-semibold text-sm">{fmtVND(r.total_price)}</span> },
    { header: 'Loại', render: r => <Badge color={r.order_type === 'IN' ? 'blue' : 'purple'}>{r.order_type}</Badge> },
    { header: 'Trạng thái', render: r => <Badge color={STATUS_COLORS[r.status]}>{STATUS_LABELS[r.status] || r.status}</Badge> },
    { header: 'Ngày tạo', render: r => <span className="text-xs text-gray-500">{fmtDate(r.createdAt)}</span> },
    { header: 'Thao tác', render: r => (
      <div className="flex gap-2">
        <button onClick={() => openDetail(r)} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">Chi tiết</button>
        {r.status === 'Draft' && r.order_type === 'OUT' && (
          <>
            <button onClick={() => handleStatus(r._id, 'Cancelled')} className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100">Hủy</button>
          </>
        )}
      </div>
    )},
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Đơn hàng</h2>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4 flex flex-wrap gap-3">
        <select value={filter.order_type} onChange={e => setFilter({...filter, order_type: e.target.value})}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">Tất cả loại</option>
          <option value="OUT">Đơn bán (OUT)</option>
          <option value="IN">Đơn nhập (IN)</option>
        </select>
        <select value={filter.status} onChange={e => setFilter({...filter, status: e.target.value})}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">Tất cả trạng thái</option>
          <option value="Draft">Chờ xử lý</option>
          <option value="Shipping">Đang vận chuyển</option>
          <option value="Completed">Hoàn thành</option>
          <option value="Cancelled">Đã hủy</option>
          <option value="Returned">Đã trả hàng</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <Table columns={columns} data={orders} loading={loading} emptyText="Chưa có đơn hàng" />
        <div className="px-4 pb-4"><Pagination page={page} total={total} onChange={setPage} /></div>
      </div>

      {/* Detail Modal */}
      <Modal open={showDetail} onClose={() => setShowDetail(false)} title={`Chi tiết đơn #${selected?._id?.slice(-8)}`} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 rounded-xl p-3">
              <div><span className="text-gray-500">Khách hàng:</span> <b>{selected.customer_id?.full_name || selected.user_id?.username}</b></div>
              <div className="flex items-center gap-2"><span className="text-gray-500">Trạng thái:</span> <Badge color={STATUS_COLORS[selected.status]}>{STATUS_LABELS[selected.status] || selected.status}</Badge></div>
              <div><span className="text-gray-500">Tổng tiền:</span> <b className="text-green-600">{fmtVND(selected.total_price)}</b></div>
              <div><span className="text-gray-500">Giảm giá:</span> <span className="text-red-500">-{fmtVND(selected.discount_amount)}</span></div>
              {selected.voucher_id && <div><span className="text-gray-500">Voucher:</span> <span className="font-mono text-xs bg-green-100 px-1 rounded">{selected.voucher_id.code}</span></div>}
              {selected.shipping_address && <div className="col-span-2"><span className="text-gray-500">Địa chỉ:</span> {selected.shipping_address}</div>}
              {selected.payments?.length > 0 && (
                <div className="col-span-2 border-t pt-2 mt-1">
                  <span className="text-gray-500 font-medium">Thanh toán:</span>
                  <div className="mt-1 space-y-1">
                    {selected.payments.map((p, i) => (
                      <div key={i} className="flex justify-between text-xs bg-white rounded px-2 py-1 border border-gray-100">
                        <span className="font-medium">{p.method}</span>
                        <span className="text-green-600 font-semibold">{fmtVND(p.amount)}</span>
                        {p.transaction_id && <span className="text-gray-400 font-mono">{p.transaction_id}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Sản phẩm</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500">SL</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Đơn giá</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">T.Tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {selected.details?.map((d, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2">
                        <p className="font-medium">{d.variant_id?.product_id?.name || d.variant_id?.sku}</p>
                        <p className="text-xs text-gray-400">{d.variant_id?.sku}</p>
                      </td>
                      <td className="px-4 py-2 text-center">{d.quantity}</td>
                      <td className="px-4 py-2 text-right">{fmtVND(d.unit_price)}</td>
                      <td className="px-4 py-2 text-right font-semibold">{fmtVND(d.unit_price * d.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selected.status === 'Draft' && selected.order_type === 'OUT' && (
              <div className="flex gap-3 pt-2">
                {/* <button onClick={() => handleStatus(selected._id, 'Completed')} disabled={processing}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-60">
                  Duyệt hoàn tất
                </button> */}
                {/* <button onClick={() => handleStatus(selected._id, 'Cancelled')} disabled={processing}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 disabled:opacity-60">
                  Hủy đơn
                </button> */}
                <button onClick={() => { setShowDetail(false); setShipForm({ carrier: '', tracking_code: '', shipping_fee: '', shipping_address: selected?.shipping_address || '' }); setShowShipment(true); }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                  Tạo vận đơn
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={showShipment} onClose={() => setShowShipment(false)} title="Tạo vận đơn">
        <form onSubmit={handleCreateShipment} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Đơn vị vận chuyển" required>
              <select value={shipForm.carrier_id}
                onChange={e => setShipForm({...shipForm, carrier_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required>
                <option value="">-- Chọn đơn vị --</option>
                {carriers.map(c => <option key={c._id} value={c._id}>{c.name} ({c.code})</option>)}
              </select>
            </Field>
            <Field label="Mã vận đơn (tự tạo nếu để trống)">
              <Input value={shipForm.tracking_code} onChange={e => setShipForm({...shipForm, tracking_code: e.target.value})} placeholder="Tự động tạo..." />
            </Field>
            <Field label="Phí vận chuyển">
              <Input type="number" value={shipForm.shipping_fee} onChange={e => setShipForm({...shipForm, shipping_fee: e.target.value})} placeholder="35000" />
            </Field>
          </div>
          <Field label="Địa chỉ giao hàng">
            <Input value={shipForm.shipping_address} onChange={e => setShipForm({...shipForm, shipping_address: e.target.value})}
              placeholder={selected?.shipping_address || '123 Lê Lợi, Q.1, TP.HCM'} />
          </Field>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowShipment(false)} className="px-4 py-2 border rounded-lg text-sm">Hủy</button>
            <button type="submit" disabled={processing} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60">Tạo vận đơn</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
