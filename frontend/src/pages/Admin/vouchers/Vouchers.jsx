import React, { useState, useEffect, useCallback } from 'react';
import { voucherAPI } from '../../../api/services';
import { Table, Badge, Modal, Field, Input, Select, Confirm, Pagination, fmtVND, fmtDate } from '../../../components/Common/UI';
import { toast } from '../../../components/Common/Toast';

export default function AdminVouchers() {
  const [vouchers, setVouchers]   = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selected, setSelected]   = useState(null);
  const [stats, setStats]         = useState(null);
  const [deleting, setDeleting]   = useState(false);
  const [form, setForm] = useState({
    code: '', description: '', discount_type: 'percent', discount_value: '', max_discount: '',
    min_order_value: 0, max_uses: 100, starts_at: '', expires_at: ''
  });

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await voucherAPI.getAll({ page, limit: 20 });
      setVouchers(data.data || []);
      setTotal(data.total || 0);
    } catch { toast.error('Không tải được voucher'); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await voucherAPI.create(form);
      toast.success('Đã tạo voucher!');
      setShowModal(false);
      setForm({ code: '', description: '', discount_type: 'percent', discount_value: '', max_discount: '', min_order_value: 0, max_uses: 100, starts_at: '', expires_at: '' });
      fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
  };

  const handleToggle = async (id) => {
    try {
      await voucherAPI.toggle(id);
      toast.success('Đã cập nhật!');
      fetch();
    } catch { toast.error('Lỗi'); }
  };

  const openStats = async (v) => {
    try {
      const { data } = await voucherAPI.getStats(v._id);
      setStats(data.data);
      setSelected(v);
      setShowStats(true);
    } catch { toast.error('Lỗi'); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await voucherAPI.delete(selected._id);
      toast.success('Đã xóa!');
      setShowDelete(false);
      fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Không thể xóa'); }
    finally { setDeleting(false); }
  };

  const columns = [
    { header: 'Mã', render: r => <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{r.code}</span> },
    { header: 'Loại giảm', render: r => (
      <span className="text-sm">
        {r.discount_type === 'percent' ? `${r.discount_value}%` : fmtVND(r.discount_value)}
        {r.max_discount ? ` (tối đa ${fmtVND(r.max_discount)})` : ''}
      </span>
    )},
    { header: 'Đơn tối thiểu', render: r => <span className="text-sm">{fmtVND(r.min_order_value)}</span> },
    { header: 'Đã dùng', render: r => <span className="text-sm font-mono">{r.used_count}/{r.max_uses}</span> },
    { header: 'Hết hạn', render: r => <span className="text-xs text-gray-500">{fmtDate(r.expires_at)}</span> },
    { header: 'Trạng thái', render: r => <Badge color={r.is_active ? 'green' : 'red'}>{r.is_active ? 'Hoạt động' : 'Tắt'}</Badge> },
    { header: 'Thao tác', render: r => (
      <div className="flex gap-2">
        <button onClick={() => openStats(r)} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">Stats</button>
        <button onClick={() => handleToggle(r._id)} className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded hover:bg-amber-100">
          {r.is_active ? 'Tắt' : 'Bật'}
        </button>
        <button onClick={() => { setSelected(r); setShowDelete(true); }} className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100">Xóa</button>
      </div>
    )},
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Voucher</h2>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          + Tạo voucher
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <Table columns={columns} data={vouchers} loading={loading} emptyText="Chưa có voucher" />
        <div className="px-4 pb-4"><Pagination page={page} total={total} onChange={setPage} /></div>
      </div>

      {/* Create Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Tạo voucher mới">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Mã voucher" required>
              <Input value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} required placeholder="SALE20" />
            </Field>
            <Field label="Loại giảm" required>
              <Select value={form.discount_type} onChange={e => setForm({...form, discount_type: e.target.value})}>
                <option value="percent">Phần trăm (%)</option>
                <option value="fixed">Số tiền cố định</option>
              </Select>
            </Field>
            <Field label={form.discount_type === 'percent' ? 'Giảm (%)' : 'Giảm (₫)'} required>
              <Input type="number" value={form.discount_value} onChange={e => setForm({...form, discount_value: e.target.value})} required min={0} max={form.discount_type === 'percent' ? 100 : undefined} />
            </Field>
            {form.discount_type === 'percent' && (
              <Field label="Giảm tối đa (₫)">
                <Input type="number" value={form.max_discount} onChange={e => setForm({...form, max_discount: e.target.value})} placeholder="100000" min={0} />
              </Field>
            )}
            <Field label="Đơn tối thiểu (₫)">
              <Input type="number" value={form.min_order_value} onChange={e => setForm({...form, min_order_value: e.target.value})} min={0} />
            </Field>
            <Field label="Số lần dùng tối đa">
              <Input type="number" value={form.max_uses} onChange={e => setForm({...form, max_uses: e.target.value})} min={1} />
            </Field>
            <Field label="Ngày bắt đầu">
              <Input type="datetime-local" value={form.starts_at} onChange={e => setForm({...form, starts_at: e.target.value})} />
            </Field>
            <Field label="Ngày hết hạn" required>
              <Input type="datetime-local" value={form.expires_at} onChange={e => setForm({...form, expires_at: e.target.value})} required />
            </Field>
          </div>
          <Field label="Mô tả">
            <Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Mô tả voucher..." />
          </Field>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Hủy</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Tạo</button>
          </div>
        </form>
      </Modal>

      {/* Stats Modal */}
      <Modal open={showStats} onClose={() => setShowStats(false)} title={`Thống kê — ${selected?.code}`} size="sm">
        {stats && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-blue-700">{stats.used_count}</p>
                <p className="text-xs text-blue-500 mt-1">Đã sử dụng</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-green-700">{stats.remaining}</p>
                <p className="text-xs text-green-500 mt-1">Còn lại</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex justify-between mb-1">
                <span className="text-xs text-gray-500">Tỷ lệ sử dụng</span>
                <span className="text-xs font-bold">{stats.usage_rate}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: stats.usage_rate }} />
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Confirm open={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete}
        loading={deleting} title="Xóa voucher" message={`Xóa voucher "${selected?.code}"?`} />
    </div>
  );
}
