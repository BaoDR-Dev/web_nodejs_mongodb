import React, { useState, useEffect, useCallback } from 'react';
import { categoryAPI, brandAPI, attributeAPI, returnAPI, shipmentAPI } from '../../../api/services';
import { Table, Modal, Field, Input, Confirm, Badge, fmtDate, fmtVND } from '../../../components/Common/UI';
import { toast } from '../../../components/Common/Toast';

// ── Categories ─────────────────────────────────────────────────────────────────
export function AdminCategories() {
  const [cats, setCats]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selected, setSelected]   = useState(null);
  const [deleting, setDeleting]   = useState(false);
  const [form, setForm]           = useState({ name: ''});

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const { data } = await categoryAPI.getAll(); setCats(data.data || []); }
    catch { toast.error('Lỗi tải danh mục'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (selected) { await categoryAPI.update(selected._id, form); toast.success('Đã cập nhật!'); }
      else          { await categoryAPI.create(form); toast.success('Đã tạo danh mục!'); }
      setShowModal(false); setSelected(null); setForm({ name: '', description: '' }); fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await categoryAPI.delete(selected._id); toast.success('Đã xóa!'); setShowDelete(false); fetch(); }
    catch (err) { toast.error(err.response?.data?.message || 'Không thể xóa'); }
    finally { setDeleting(false); }
  };

  const columns = [
    { header: 'Tên danh mục', render: r => <span className="font-semibold">{r.name}</span> },
    { header: 'Mô tả', render: r => r.description || '—' },
    { header: 'Thao tác', render: r => (
      <div className="flex gap-2">
        <button onClick={() => { setSelected(r); setForm({ name: r.name, description: r.description }); setShowModal(true); }}
          className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded">Sửa</button>
        <button onClick={() => { setSelected(r); setShowDelete(true); }}
          className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded">Xóa</button>
      </div>
    )},
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Danh mục</h2>
        <button onClick={() => { setSelected(null); setForm({ name: '', description: '' }); setShowModal(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">+ Thêm danh mục</button>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <Table columns={columns} data={cats} loading={loading} emptyText="Chưa có danh mục" />
      </div>
      <Modal open={showModal} onClose={() => setShowModal(false)} title={selected ? 'Sửa danh mục' : 'Thêm danh mục'} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Tên danh mục" required><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></Field>
          <Field label="Mô tả"><Input value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} /></Field>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Hủy</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Lưu</button>
          </div>
        </form>
      </Modal>
      <Confirm open={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete} loading={deleting}
        title="Xóa danh mục" message={`Xóa "${selected?.name}"?`} />
    </div>
  );
}

// ── Brands ─────────────────────────────────────────────────────────────────────
export function AdminBrands() {
  const [brands, setBrands]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selected, setSelected]   = useState(null);
  const [deleting, setDeleting]   = useState(false);
  const [form, setForm] = useState({ name: '', origin: '' }); 

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const { data } = await brandAPI.getAll(); setBrands(data.data || []); }
    catch { toast.error('Lỗi tải thương hiệu'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (selected) { await brandAPI.update(selected._id, form); toast.success('Đã cập nhật!'); }
      else          { await brandAPI.create(form); toast.success('Đã tạo!'); }
      setShowModal(false); setSelected(null); fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await brandAPI.delete(selected._id); toast.success('Đã xóa!'); setShowDelete(false); fetch(); }
    catch (err) { toast.error(err.response?.data?.message || 'Không thể xóa'); }
    finally { setDeleting(false); }
  };

  const columns = [
    { header: 'Thương hiệu', render: r => <span className="font-semibold">{r.brand_name || r.name || '—'}</span> },
    { header: 'Mô tả', render: r => r.description || r.origin || '—' },
    { header: 'Thao tác', render: r => (
      <div className="flex gap-2">
        <button onClick={() => { setSelected(r); setForm({ brand_name: r.brand_name || r.name, description: r.description || r.origin }); setShowModal(true); }}
          className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded">Sửa</button>
        <button onClick={() => { setSelected(r); setShowDelete(true); }}
          className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded">Xóa</button>
      </div>
    )},
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Thương hiệu</h2>
        <button onClick={() => { setSelected(null); setForm({ brand_name: '', description: '' }); setShowModal(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">+ Thêm</button>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <Table columns={columns} data={brands} loading={loading} emptyText="Chưa có thương hiệu" />
      </div>
      <Modal open={showModal} onClose={() => setShowModal(false)} title={selected ? 'Sửa thương hiệu' : 'Thêm thương hiệu'} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Tên thương hiệu" required><Input value={form.brand_name} onChange={e => setForm({...form, brand_name: e.target.value})} required /></Field>
          <Field label="Mô tả"><Input value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} /></Field>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Hủy</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Lưu</button>
          </div>
        </form>
      </Modal>
      <Confirm open={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete} loading={deleting}
        title="Xóa thương hiệu" message={`Xóa "${selected?.brand_name || selected?.name}"?`} />
    </div>
  );
}

// ── Attributes ─────────────────────────────────────────────────────────────────
export function AdminAttributes() {
  const [activeTab, setActiveTab] = useState('color');
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selected, setSelected] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({});

  const tabs = [
    { key: 'color', label: 'Màu sắc', fields: ['color_name', 'hex_code'] },
    { key: 'size', label: 'Kích thước', fields: ['size_name'] },
    { key: 'type', label: 'Loại', fields: ['type_name'] }
  ];

  const fetch = useCallback(async () => {
    setLoading(true);
    try { 
      const { data } = await attributeAPI.get(activeTab);
      setAttributes(data.data || []); 
    }
    catch { toast.error('Lỗi tải thuộc tính'); }
    finally { setLoading(false); }
  }, [activeTab]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (selected) { await attributeAPI.update(activeTab, selected._id, form); toast.success('Đã cập nhật!'); }
      else          { await attributeAPI.create(activeTab, form); toast.success('Đã tạo!'); }
      setShowModal(false); setSelected(null); setForm({}); fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await attributeAPI.delete(activeTab, selected._id); toast.success('Đã xóa!'); setShowDelete(false); fetch(); }
    catch (err) { toast.error(err.response?.data?.message || 'Không thể xóa'); }
    finally { setDeleting(false); }
  };

  const getDisplayName = (attr) => {
    if (!attr) return '—';
    if (activeTab === 'color') return attr.color_name;
    if (activeTab === 'size') return attr.size_name;
    return attr.type_name;
  };

  const getFormFields = () => {
    const tab = tabs.find(t => t.key === activeTab);
    return tab.fields;
  };

  const columns = [
    { header: 'Tên', render: r => <span className="font-semibold">{getDisplayName(r)}</span> },
    { header: activeTab === 'color' ? 'Mã hex' : 'Mô tả', render: r => r.hex_code || '—' },
    { header: 'Thao tác', render: r => (
      <div className="flex gap-2">
        <button onClick={() => { 
          setSelected(r); 
          setForm(activeTab === 'color' ? { color_name: r.color_name, hex_code: r.hex_code } : 
                  activeTab === 'size' ? { size_name: r.size_name } : { type_name: r.type_name }); 
          setShowModal(true); 
        }}
          className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded">Sửa</button>
        <button onClick={() => { setSelected(r); setShowDelete(true); }}
          className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded">Xóa</button>
      </div>
    )},
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Thuộc tính sản phẩm</h2>
        <button onClick={() => { setSelected(null); setForm({}); setShowModal(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">+ Thêm</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === tab.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <Table columns={columns} data={attributes} loading={loading} emptyText={`Chưa có ${tabs.find(t => t.key === activeTab)?.label.toLowerCase()}`} />
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={`${selected ? 'Sửa' : 'Thêm'} ${tabs.find(t => t.key === activeTab)?.label}`}>
        <form onSubmit={handleSave} className="space-y-4">
          {getFormFields().map(field => (
            <Field key={field} label={field === 'color_name' ? 'Tên màu' : field === 'size_name' ? 'Tên kích thước' : field === 'type_name' ? 'Tên loại' : 'Mã hex'} required={field !== 'hex_code'}>
              <Input value={form[field] || ''} onChange={e => setForm({...form, [field]: e.target.value})} required={field !== 'hex_code'} />
            </Field>
          ))}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Hủy</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Lưu</button>
          </div>
        </form>
      </Modal>

      <Confirm open={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete} loading={deleting}
        title="Xóa thuộc tính" message={`Xóa "${getDisplayName(selected)}"?`} />
    </div>
  );
}

// ── Returns ────────────────────────────────────────────────────────────────────
export function AdminReturns() {
  const [returns, setReturns]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [filterStatus, setFilter] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await returnAPI.getAll({ status: filterStatus || undefined, limit: 50 });
      setReturns(data.data || []);
    } catch { toast.error('Lỗi tải đổi trả'); }
    finally { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleProcess = async (status, note = '') => {
    setProcessing(true);
    try {
      await returnAPI.process(selected._id, { status, note });
      toast.success(`Đã ${status === 'Approved' ? 'duyệt' : 'từ chối'}!`);
      setShowDetail(false); fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
    finally { setProcessing(false); }
  };

  const statusColor = { Pending: 'amber', Approved: 'green', Rejected: 'red', Completed: 'blue' };
  const statusLabel = { Pending: 'Chờ duyệt', Approved: 'Đã duyệt', Rejected: 'Từ chối', Completed: 'Hoàn tất' };

  const columns = [
    { header: '#', render: r => <span className="font-mono text-xs">{r._id.slice(-8)}</span> },
    { header: 'Khách hàng', render: r => r.customer_id?.full_name || '—' },
    { header: 'Đơn gốc', render: r => <span className="font-mono text-xs">{r.order_id?._id?.slice(-8)}</span> },
    { header: 'Trạng thái', render: r => <Badge color={statusColor[r.status]}>{statusLabel[r.status] || r.status}</Badge> },
    { header: 'Ngày tạo', render: r => <span className="text-xs text-gray-400">{fmtDate(r.createdAt)}</span> },
    { header: 'Thao tác', render: r => (
      <button onClick={() => { setSelected(r); setShowDetail(true); }}
        className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">Chi tiết</button>
    )},
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Đổi trả</h2>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 shadow-sm">
        <select value={filterStatus} onChange={e => setFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">Tất cả</option>
          <option value="Pending">Chờ duyệt</option>
          <option value="Approved">Đã duyệt</option>
          <option value="Rejected">Từ chối</option>
          <option value="Completed">Hoàn tất</option>
        </select>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <Table columns={columns} data={returns} loading={loading} emptyText="Chưa có yêu cầu đổi trả" />
      </div>

      <Modal open={showDetail} onClose={() => setShowDetail(false)} title="Chi tiết đổi trả">
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-xl p-3">
              <div><span className="text-gray-500">Khách:</span> <b>{selected.customer_id?.full_name}</b></div>
              <div><span className="text-gray-500">Trạng thái:</span> <Badge color={statusColor[selected.status]}>{statusLabel[selected.status] || selected.status}</Badge></div>
              <div><span className="text-gray-500">Ghi chú:</span> {selected.note || '—'}</div>
            </div>
            <div className="space-y-2">
              {selected.items?.map((item, i) => (
                <div key={i} className="p-2 bg-gray-50 rounded-lg">
                  <span className="font-mono text-xs">{item.variant_id?.sku}</span> × {item.quantity}
                  {item.reason && <p className="text-xs text-gray-500 mt-0.5">{item.reason}</p>}
                </div>
              ))}
            </div>
            {selected.status === 'Pending' && (
              <div className="flex gap-3 pt-2">
                <button onClick={() => handleProcess('Approved')} disabled={processing}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-60">
                  Duyệt
                </button>
                <button onClick={() => handleProcess('Rejected', 'Không đủ điều kiện')} disabled={processing}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 disabled:opacity-60">
                  Từ chối
                </button>
              </div>
            )}
            {selected.status === 'Approved' && (
              <button onClick={async () => { setProcessing(true); try { await returnAPI.complete(selected._id); toast.success('Hoàn tất!'); setShowDetail(false); fetch(); } catch { toast.error('Lỗi'); } finally { setProcessing(false); } }}
                disabled={processing} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60">
                Hoàn tất đổi trả
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Shipments ─────────────────────────────────────────────────────────────────
export function AdminShipments() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const { data } = await shipmentAPI.getAll({ limit: 50 }); setShipments(data.data || []); }
    catch { toast.error('Lỗi tải vận đơn'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleUpdateStatus = async (status) => {
    try {
      await shipmentAPI.updateStatus(selected._id, { status });
      toast.success('Đã cập nhật!');
      setShowModal(false); fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
  };

  const statusColor = { Pending: 'amber', Picking: 'blue', 'In Transit': 'purple', Delivered: 'green', Failed: 'red', Returned: 'gray' };
  const statusLabel = { Pending: 'Chờ lấy hàng', Picking: 'Đang lấy hàng', 'In Transit': 'Đang vận chuyển', Delivered: 'Đã giao', Failed: 'Giao thất bại', Returned: 'Đã hoàn trả' };
  const statusList  = [
    { value: 'Pending',    label: 'Chờ lấy hàng' },
    { value: 'Picking',    label: 'Đang lấy hàng' },
    { value: 'In Transit', label: 'Đang vận chuyển' },
    { value: 'Delivered',  label: 'Đã giao' },
    { value: 'Failed',     label: 'Giao thất bại' },
    { value: 'Returned',   label: 'Đã hoàn trả' },
  ];

  const columns = [
    { header: 'Đơn hàng', render: r => <span className="font-mono text-xs">{r.order_id?._id?.slice(-8) || '—'}</span> },
    { header: 'Đơn vị', render: r => r.carrier || '—' },
    { header: 'Mã vận đơn', render: r => <span className="font-mono text-xs">{r.tracking_code || '—'}</span> },
    { header: 'Trạng thái', render: r => <Badge color={statusColor[r.status] || 'gray'}>{statusLabel[r.status] || r.status}</Badge> },
    { header: 'Ngày tạo', render: r => <span className="text-xs text-gray-400">{fmtDate(r.createdAt)}</span> },
    { header: 'Thao tác', render: r => (
      <button onClick={() => { setSelected(r); setShowModal(true); }}
        className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">Cập nhật</button>
    )},
  ];


  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Vận chuyển</h2>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <Table columns={columns} data={shipments} loading={loading} emptyText="Chưa có vận đơn" />
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Cập nhật trạng thái vận đơn" size="sm">
        {selected && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">Trạng thái hiện tại: <Badge color={statusColor[selected.status]}>{statusLabel[selected.status] || selected.status}</Badge></p>
            <div className="grid grid-cols-2 gap-2">
              {statusList.filter(s => s.value !== selected.status).map(s => (
                <button key={s.value} onClick={() => handleUpdateStatus(s.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 hover:border-blue-300">
                  → {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
