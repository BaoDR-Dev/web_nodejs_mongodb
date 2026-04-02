import React, { useState, useEffect, useCallback } from 'react';
import { warehouseAPI, locationAPI, stockAPI } from '../../../api/services';
import { Table, Modal, Field, Input, Confirm, Pagination, fmtDate, Badge } from '../../../components/Common/UI';
import { toast } from '../../../components/Common/Toast';

// ── Warehouses ─────────────────────────────────────────────────────────────────
export function AdminWarehouses() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selected, setSelected]     = useState(null);
  const [deleting, setDeleting]     = useState(false);
  const [form, setForm] = useState({ warehouse_name: '', address: '', capacity: '' });

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await warehouseAPI.getAll();
      setWarehouses(data.data || []);
    } catch { toast.error('Lỗi tải kho'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (selected) { await warehouseAPI.update(selected._id, form); toast.success('Đã cập nhật!'); }
      else          { await warehouseAPI.create(form); toast.success('Đã tạo kho!'); }
      setShowModal(false); setSelected(null); setForm({ warehouse_name: '', address: '', capacity: '' }); fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await warehouseAPI.delete(selected._id); toast.success('Đã xóa!'); setShowDelete(false); fetch(); }
    catch (err) { toast.error(err.response?.data?.message || 'Không thể xóa'); }
    finally { setDeleting(false); }
  };

  const columns = [
    { header: 'Tên kho', render: r => <span className="font-semibold">{r.warehouse_name}</span> },
    { header: 'Địa chỉ', render: r => r.address },
    { header: 'Sức chứa', render: r => r.capacity || '—' },
    { header: 'Thao tác', render: r => (
      <div className="flex gap-2">
        <button onClick={() => { setSelected(r); setForm({ warehouse_name: r.warehouse_name, address: r.address, capacity: r.capacity }); setShowModal(true); }}
          className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded hover:bg-amber-100">Sửa</button>
        <button onClick={() => { setSelected(r); setShowDelete(true); }}
          className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100">Xóa</button>
      </div>
    )},
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Kho hàng</h2>
        <button onClick={() => { setSelected(null); setForm({ warehouse_name: '', address: '', capacity: '' }); setShowModal(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">+ Thêm kho</button>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <Table columns={columns} data={warehouses} loading={loading} emptyText="Chưa có kho" />
      </div>
      <Modal open={showModal} onClose={() => setShowModal(false)} title={selected ? 'Sửa kho' : 'Thêm kho mới'} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Tên kho" required><Input value={form.warehouse_name} onChange={e => setForm({...form, warehouse_name: e.target.value})} required /></Field>
          <Field label="Địa chỉ" required><Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} required /></Field>
          <Field label="Sức chứa"><Input type="number" value={form.capacity} onChange={e => setForm({...form, capacity: e.target.value})} min={0} /></Field>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Hủy</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Lưu</button>
          </div>
        </form>
      </Modal>
      <Confirm open={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete} loading={deleting}
        title="Xóa kho" message={`Xóa kho "${selected?.warehouse_name}"?`} />
    </div>
  );
}

// ── Locations ─────────────────────────────────────────────────────────────────
export function AdminLocations() {
  const [locations, setLocations]   = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selected, setSelected]     = useState(null);
  const [deleting, setDeleting]     = useState(false);
  const [filterWh, setFilterWh]     = useState('');
  const [form, setForm] = useState({ warehouse_id: '', location_name: '', description: '', status: 'Active' });

  // --- STATE MỚI CHO TÍNH NĂNG XEM HÀNG TRÊN KỆ ---
  const [showItems, setShowItems] = useState(false);
  const [shelfItems, setShelfItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await locationAPI.getAll({ warehouse_id: filterWh || undefined });
      setLocations(data.data || []);
    } catch { toast.error('Lỗi tải kệ'); }
    finally { setLoading(false); }
  }, [filterWh]);

  useEffect(() => { fetch(); }, [fetch]);
  
  useEffect(() => {
    warehouseAPI.getAll().then(r => setWarehouses(r.data.data || [])).catch(() => {});
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (selected && !showItems) { await locationAPI.update(selected._id, form); toast.success('Đã cập nhật!'); }
      else { await locationAPI.create(form); toast.success('Đã tạo kệ!'); }
      setShowModal(false); setSelected(null); fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await locationAPI.delete(selected._id); toast.success('Đã xóa!'); setShowDelete(false); fetch(); }
    catch (err) { toast.error(err.response?.data?.message || 'Không thể xóa'); }
    finally { setDeleting(false); }
  };

  // --- HÀM MỚI: XEM HÀNG TRÊN KỆ ---
  const viewItemsOnShelf = async (location) => {
    setSelected(location);
    setShowItems(true);
    setLoadingItems(true);
    try {
      // Gọi API kiểm kho lọc theo ID của kệ này
      const { data } = await stockAPI.audit({ location_id: location._id });
      setShelfItems(data.data || []);
    } catch (err) {
      toast.error('Lỗi tải danh sách hàng hóa');
    } finally {
      setLoadingItems(false);
    }
  };

  const statusColor = { Active: 'green', Full: 'red', Maintenance: 'amber' };

  const columns = [
    { header: 'Tên kệ', render: r => <span className="font-semibold">{r.location_name}</span> },
    { header: 'Kho', render: r => r.warehouse_id?.warehouse_name || '—' },
    { header: 'Mô tả', render: r => r.description || '—' },
    { header: 'Trạng thái', render: r => <Badge color={statusColor[r.status] || 'gray'}>{r.status}</Badge> },
    { header: 'Thao tác', render: r => (
      <div className="flex gap-2">
        {/* NÚT MỚI: XEM HÀNG */}
        <button onClick={() => viewItemsOnShelf(r)}
          className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">
          📦 Xem hàng
        </button>

        <button onClick={() => { setSelected(r); setForm({ warehouse_id: r.warehouse_id?._id, location_name: r.location_name, description: r.description, status: r.status }); setShowModal(true); }}
          className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded hover:bg-amber-100">Sửa</button>
        <button onClick={() => { setSelected(r); setShowDelete(true); }}
          className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100">Xóa</button>
      </div>
    )},
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Kệ hàng</h2>
        <button onClick={() => { setSelected(null); setForm({ warehouse_id: '', location_name: '', description: '', status: 'Active' }); setShowModal(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">+ Thêm kệ</button>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 shadow-sm">
        <select value={filterWh} onChange={e => setFilterWh(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">Tất cả kho</option>
          {warehouses.map(w => <option key={w._id} value={w._id}>{w.warehouse_name}</option>)}
        </select>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <Table columns={columns} data={locations} loading={loading} emptyText="Chưa có kệ hàng" />
      </div>

      {/* Modal Sửa/Thêm Kệ */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={selected && !showItems ? 'Sửa kệ' : 'Thêm kệ mới'} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Kho" required>
            <select value={form.warehouse_id} onChange={e => setForm({...form, warehouse_id: e.target.value})} required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">Chọn kho</option>
              {warehouses.map(w => <option key={w._id} value={w._id}>{w.warehouse_name}</option>)}
            </select>
          </Field>
          <Field label="Tên kệ" required><Input value={form.location_name} onChange={e => setForm({...form, location_name: e.target.value})} required placeholder="Kệ A1" /></Field>
          <Field label="Mô tả"><Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></Field>
          <Field label="Trạng thái">
            <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="Active">Active</option>
              <option value="Full">Full</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </Field>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Hủy</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Lưu</button>
          </div>
        </form>
      </Modal>

      <Confirm open={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete} loading={deleting}
        title="Xóa kệ" message={`Xóa kệ "${selected?.location_name}"?`} />

      {/* --- MODAL MỚI: XEM HÀNG TRÊN KỆ --- */}
      <Modal open={showItems} onClose={() => setShowItems(false)} title={`Hàng hóa trên kệ: ${selected?.location_name}`} size="lg">
        {loadingItems ? (
          <p className="text-center py-4 text-gray-500">Đang tải dữ liệu...</p>
        ) : (
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 font-semibold">Sản phẩm</th>
                  <th className="px-4 py-2 font-semibold">Mã SKU</th>
                  <th className="px-4 py-2 font-semibold text-center text-blue-600">SL trên kệ này</th>
                  <th className="px-4 py-2 font-semibold text-center text-gray-500">Tổng tồn kho</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {shelfItems.map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{item.product || '—'}</td>
                    <td className="px-4 py-2 font-mono text-xs">{item.variant_sku || '—'}</td>
                    <td className="px-4 py-2 text-center font-bold text-blue-600">{item.system_quantity}</td>
                    <td className="px-4 py-2 text-center text-gray-500">{item.total_stock}</td>
                  </tr>
                ))}
                {shelfItems.length === 0 && (
                  <tr><td colSpan="4" className="text-center py-6 text-gray-400">Kệ này đang trống, chưa có hàng hóa.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Stock Movements ────────────────────────────────────────────────────────────
export function AdminStock() {
  const [movements, setMovements] = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [audit, setAudit]         = useState([]);
  const [tab, setTab]             = useState('movements'); // movements | audit

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'movements') {
        const { data } = await stockAPI.getAll({ page, limit: 30 });
        setMovements(data.data || []); setTotal(data.total || 0);
      } else {
        const { data } = await stockAPI.audit();
        setAudit(data.data || []);
      }
    } catch { toast.error('Lỗi tải dữ liệu'); }
    finally { setLoading(false); }
  }, [page, tab]);

  useEffect(() => { fetch(); }, [fetch]);

  const typeColor = { IN: 'green', OUT: 'red', TRANSFER: 'blue', ADJUSTMENT: 'amber' };

  const movColumns = [
    { header: 'Sản phẩm', render: r => <span className="text-xs font-mono">{r.variant_id?.sku || '—'}</span> },
    { header: 'Loại', render: r => <Badge color={typeColor[r.movement_type] || 'gray'}>{r.movement_type}</Badge> },
    { header: 'SL thay đổi', render: r => (
      <span className={`font-mono font-bold text-sm ${r.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
        {r.quantity_change > 0 ? '+' : ''}{r.quantity_change}
      </span>
    )},
    { header: 'Trước → Sau', render: r => <span className="text-xs font-mono text-gray-500">{r.quantity_before} → {r.quantity_after}</span> },
    { header: 'Lý do', render: r => <span className="text-xs text-gray-600">{r.reason || '—'}</span> },
    { header: 'Người thực hiện', render: r => <span className="text-xs">{r.created_by?.username || '—'}</span> },
    { header: 'Thời gian', render: r => <span className="text-xs text-gray-400">{fmtDate(r.createdAt)}</span> },
  ];

  const auditColumns = [
    { header: 'Sản phẩm', render: r => <div><p className="font-medium text-sm">{r.product}</p><p className="text-xs text-gray-400 font-mono">{r.variant_sku}</p></div> },
    { header: 'Kệ', render: r => <span className="text-sm">{r.location || '—'}</span> },
    { header: 'SL theo kệ', render: r => <span className="font-mono font-bold text-blue-700">{r.system_quantity}</span> },
    { header: 'Tổng tồn kho', render: r => <span className="font-mono font-bold text-gray-700">{r.total_stock}</span> },
    { header: 'Trạng thái', render: r => (
      <Badge color={r.system_quantity < 5 ? 'red' : r.system_quantity < 20 ? 'amber' : 'green'}>
        {r.system_quantity < 5 ? 'Gần hết' : r.system_quantity < 20 ? 'Thấp' : 'Ổn định'}
      </Badge>
    )},
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Biến động kho</h2>
      </div>
      <div className="flex gap-2 mb-4">
        {['movements', 'audit'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {t === 'movements' ? 'Lịch sử biến động' : 'Kiểm kho'}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        {tab === 'movements' ? (
          <>
            <Table columns={movColumns} data={movements} loading={loading} emptyText="Chưa có biến động" />
            <div className="px-4 pb-4"><Pagination page={page} total={total} onChange={setPage} limit={30} /></div>
          </>
        ) : (
          <Table columns={auditColumns} data={audit} loading={loading} emptyText="Không có dữ liệu kiểm kho" />
        )}
      </div>
    </div>
  );
}
