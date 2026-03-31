import React, { useState, useEffect, useCallback } from 'react';
import { customerAPI } from '../../../api/services';
import { Table, Modal, Field, Input, Confirm, SearchBar, Pagination, fmtVND, fmtDate, PageLoader } from '../../../components/Common/UI';
import { toast } from '../../../components/Common/Toast';

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [selected, setSelected]   = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showEdit, setShowEdit]   = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [editForm, setEditForm]   = useState({});

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await customerAPI.getAll({ page, limit: 20, name: search || undefined });
      setCustomers(data.data || []);
      setTotal(data.total || 0);
    } catch { toast.error('Không tải được khách hàng'); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetch(); }, [fetch]);

  const openDetail = async (c) => {
    try {
      const { data } = await customerAPI.getById(c._id);
      setSelected(data.data);
      setShowDetail(true);
    } catch { toast.error('Lỗi tải chi tiết'); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await customerAPI.update(selected._id, editForm);
      toast.success('Đã cập nhật!');
      setShowEdit(false);
      fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await customerAPI.delete(selected._id);
      toast.success('Đã xóa khách hàng');
      setShowDelete(false);
      setSelected(null);
      fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Không thể xóa'); }
    finally { setDeleting(false); }
  };

  const columns = [
    { header: 'Khách hàng', render: r => (
      <div>
        <p className="font-semibold text-sm">{r.full_name}</p>
        <p className="text-xs text-gray-400">{r.phone}</p>
      </div>
    )},
    { header: 'Email', render: r => <span className="text-xs text-gray-600">{r.user_id?.email || '—'}</span> },
    { header: 'Địa chỉ', render: r => <span className="text-xs text-gray-600 max-w-[150px] truncate block">{r.address || '—'}</span> },
    { header: 'Chi tiêu', render: r => <span className="font-semibold text-green-600 text-sm">{fmtVND(r.total_spending)}</span> },
    { header: 'Thao tác', render: r => (
      <div className="flex gap-2">
        <button onClick={() => openDetail(r)} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">Chi tiết</button>
        <button onClick={() => { setSelected(r); setEditForm({ full_name: r.full_name, phone: r.phone, address: r.address, sex: r.sex }); setShowEdit(true); }}
          className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded hover:bg-amber-100">Sửa</button>
        <button onClick={() => { setSelected(r); setShowDelete(true); }}
          className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100">Xóa</button>
      </div>
    )},
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Khách hàng</h2>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
        <SearchBar value={search} onChange={setSearch} onSearch={fetch} placeholder="Tìm tên, SĐT..." />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <Table columns={columns} data={customers} loading={loading} emptyText="Chưa có khách hàng" />
        <div className="px-4 pb-4"><Pagination page={page} total={total} onChange={setPage} /></div>
      </div>

      {/* Detail */}
      <Modal open={showDetail} onClose={() => setShowDetail(false)} title="Chi tiết khách hàng" size="md">
        {selected && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600">
                {selected.full_name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-lg">{selected.full_name}</p>
                <p className="text-gray-500">{selected.user_id?.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-xl p-4">
              <div><span className="text-gray-500">SĐT:</span> {selected.phone || '—'}</div>
              <div><span className="text-gray-500">Giới tính:</span> {selected.sex || '—'}</div>
              <div className="col-span-2"><span className="text-gray-500">Địa chỉ:</span> {selected.address || '—'}</div>
              <div><span className="text-gray-500">Chi tiêu:</span> <b className="text-green-600">{fmtVND(selected.total_spending)}</b></div>
              <div><span className="text-gray-500">Trạng thái:</span> {selected.user_id?.status}</div>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Cập nhật khách hàng">
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Họ tên" required><Input value={editForm.full_name || ''} onChange={e => setEditForm({...editForm, full_name: e.target.value})} required /></Field>
            <Field label="SĐT"><Input value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} /></Field>
            <Field label="Giới tính">
              <select value={editForm.sex || ''} onChange={e => setEditForm({...editForm, sex: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">Không xác định</option>
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
              </select>
            </Field>
          </div>
          <Field label="Địa chỉ"><Input value={editForm.address || ''} onChange={e => setEditForm({...editForm, address: e.target.value})} /></Field>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowEdit(false)} className="px-4 py-2 border rounded-lg text-sm">Hủy</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Lưu</button>
          </div>
        </form>
      </Modal>

      <Confirm open={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete}
        loading={deleting} title="Xóa khách hàng" message={`Xóa "${selected?.full_name}"? Thao tác không thể hoàn tác.`} />
    </div>
  );
}
