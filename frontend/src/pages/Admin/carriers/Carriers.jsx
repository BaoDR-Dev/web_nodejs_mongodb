import React, { useState, useEffect, useCallback } from 'react';
import { carrierAPI } from '../../../api/services';
import { Table, Badge, Modal, Confirm, Field, Input } from '../../../components/Common/UI';
import { toast } from '../../../components/Common/Toast';

export default function AdminCarriers() {
  const [carriers, setCarriers] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selected, setSelected] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', phone: '', website: '' });

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await carrierAPI.getAll();
      setCarriers(data.data || []);
    } catch { toast.error('Lỗi tải danh sách'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (selected) { await carrierAPI.update(selected._id, form); toast.success('Đã cập nhật!'); }
      else          { await carrierAPI.create(form); toast.success('Đã thêm!'); }
      setShowModal(false); setSelected(null); setForm({ name: '', code: '', phone: '', website: '' }); fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await carrierAPI.remove(selected._id); toast.success('Đã xóa!'); setShowDelete(false); fetch(); }
    catch (err) { toast.error(err.response?.data?.message || 'Không thể xóa'); }
    finally { setDeleting(false); }
  };

  const handleToggle = async (c) => {
    try { await carrierAPI.toggle(c._id); fetch(); }
    catch { toast.error('Lỗi'); }
  };

  const columns = [
    { header: 'Tên đơn vị', render: r => <span className="font-semibold">{r.name}</span> },
    { header: 'Mã', render: r => <span className="font-mono text-sm bg-gray-100 px-2 py-0.5 rounded">{r.code}</span> },
    { header: 'SĐT', render: r => r.phone || '—' },
    { header: 'Website', render: r => r.website ? <a href={r.website} target="_blank" rel="noreferrer" className="text-blue-600 text-xs hover:underline">{r.website}</a> : '—' },
    { header: 'Trạng thái', render: r => <Badge color={r.is_active ? 'green' : 'red'}>{r.is_active ? 'Hoạt động' : 'Ngừng'}</Badge> },
    { header: 'Thao tác', render: r => (
      <div className="flex gap-2">
        <button onClick={() => { setSelected(r); setForm({ name: r.name, code: r.code, phone: r.phone || '', website: r.website || '' }); setShowModal(true); }}
          className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded">Sửa</button>
        <button onClick={() => handleToggle(r)}
          className={`text-xs px-2 py-1 rounded ${r.is_active ? 'bg-gray-100 text-gray-600' : 'bg-green-50 text-green-700'}`}>
          {r.is_active ? 'Ẩn' : 'Hiện'}
        </button>
        <button onClick={() => { setSelected(r); setShowDelete(true); }}
          className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded">Xóa</button>
      </div>
    )},
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Đơn vị vận chuyển</h2>
        <button onClick={() => { setSelected(null); setForm({ name: '', code: '', phone: '', website: '' }); setShowModal(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">+ Thêm</button>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <Table columns={columns} data={carriers} loading={loading} emptyText="Chưa có đơn vị vận chuyển" />
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={selected ? 'Sửa đơn vị' : 'Thêm đơn vị vận chuyển'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tên đơn vị" required>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="Giao Hàng Nhanh" />
            </Field>
            <Field label="Mã (viết tắt)" required>
              <Input value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} required placeholder="GHN" />
            </Field>
            <Field label="SĐT">
              <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="1900..." />
            </Field>
            <Field label="Website">
              <Input value={form.website} onChange={e => setForm({...form, website: e.target.value})} placeholder="https://ghn.vn" />
            </Field>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Hủy</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Lưu</button>
          </div>
        </form>
      </Modal>

      <Confirm open={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete} loading={deleting}
        title="Xóa đơn vị" message={`Xóa "${selected?.name}"?`} />
    </div>
  );
}
