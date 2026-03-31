import React, { useState, useEffect, useCallback } from 'react';
import { staffAPI, userAPI, roleAPI, supplierAPI } from '../../../api/services';
import { Table, Modal, Field, Input, Select, Confirm, Pagination, SearchBar, Badge, fmtDate, fmtVND } from '../../../components/Common/UI';
import { toast } from '../../../components/Common/Toast';

// ── Staff ──────────────────────────────────────────────────────────────────────
export function AdminStaff() {
  const [staff, setStaff]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selected, setSelected]   = useState(null);
  const [deleting, setDeleting]   = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '', position: 'Nhân viên bán hàng', salary: '', username: '', email: '', password: '' });

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const { data } = await staffAPI.getAll(); setStaff(data.data || []); }
    catch { toast.error('Lỗi tải nhân viên'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (selected) { await staffAPI.update(selected._id, form); toast.success('Đã cập nhật!'); }
      else          { await staffAPI.create(form); toast.success('Đã thêm nhân viên!'); }
      setShowModal(false); setSelected(null); fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await staffAPI.delete(selected._id); toast.success('Đã xóa!'); setShowDelete(false); fetch(); }
    catch (err) { toast.error(err.response?.data?.message || 'Không thể xóa'); }
    finally { setDeleting(false); }
  };

  const columns = [
    { header: 'Nhân viên', render: r => <div><p className="font-semibold text-sm">{r.full_name}</p><p className="text-xs text-gray-400">{r.phone}</p></div> },
    { header: 'Chức vụ', render: r => <Badge color="blue">{r.position}</Badge> },
    { header: 'Lương', render: r => <span className="text-sm">{fmtVND(r.salary)}</span> },
    { header: 'Trạng thái', render: r => <Badge color={r.status === 'Đang làm việc' ? 'green' : 'red'}>{r.status}</Badge> },
    { header: 'Ngày vào', render: r => <span className="text-xs text-gray-500">{fmtDate(r.hire_date)}</span> },
    { header: 'Thao tác', render: r => (
      <div className="flex gap-2">
        <button onClick={() => { setSelected(r); setForm({ full_name: r.full_name, phone: r.phone, position: r.position, salary: r.salary, status: r.status }); setShowModal(true); }}
          className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded">Sửa</button>
        <button onClick={() => { setSelected(r); setShowDelete(true); }}
          className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded">Xóa</button>
      </div>
    )},
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Nhân viên</h2>
        <button onClick={() => { setSelected(null); setForm({ full_name: '', phone: '', position: 'Nhân viên bán hàng', salary: '', username: '', email: '', password: '' }); setShowModal(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">+ Thêm nhân viên</button>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <Table columns={columns} data={staff} loading={loading} emptyText="Chưa có nhân viên" />
      </div>
      <Modal open={showModal} onClose={() => setShowModal(false)} title={selected ? 'Sửa nhân viên' : 'Thêm nhân viên'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Họ tên" required><Input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required /></Field>
            <Field label="SĐT"><Input value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} /></Field>
            <Field label="Chức vụ">
              <Select value={form.position} onChange={e => setForm({...form, position: e.target.value})}>
                <option value="Nhân viên bán hàng">Nhân viên bán hàng</option>
                <option value="Thủ kho">Thủ kho</option>
                <option value="Admin">Admin</option>
              </Select>
            </Field>
            <Field label="Lương"><Input type="number" value={form.salary || ''} onChange={e => setForm({...form, salary: e.target.value})} min={0} /></Field>
            {!selected && (
              <>
                <Field label="Username" required><Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} required /></Field>
                <Field label="Email"><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></Field>
                <Field label="Mật khẩu" required><Input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required /></Field>
              </>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Hủy</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Lưu</button>
          </div>
        </form>
      </Modal>
      <Confirm open={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete} loading={deleting}
        title="Xóa nhân viên" message={`Xóa nhân viên "${selected?.full_name}"?`} />
    </div>
  );
}

// ── Users ─────────────────────────────────────────────────────────────────────
export function AdminUsers() {
  const [users, setUsers]         = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [roles, setRoles]         = useState([]);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await userAPI.getAll({ page, limit: 20, username: search || undefined });
      setUsers(data.data || []); setTotal(data.total || 0);
    } catch { toast.error('Lỗi tải users'); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => { roleAPI.getAll().then(r => setRoles(r.data.data || [])).catch(() => {}); }, []);

  const handleToggleBan = async (u) => {
    try {
      await userAPI.updateStatus(u._id, { status: u.status === 'Active' ? 'Banned' : 'Active' });
      toast.success('Đã cập nhật!'); fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
  };

  const handleChangeRole = async (u, roleId) => {
    try {
      await userAPI.updateRole(u._id, { role_id: roleId });
      toast.success('Đã đổi role!'); fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
  };

  const columns = [
    { header: 'Username', render: r => <span className="font-mono font-semibold text-sm">{r.username}</span> },
    { header: 'Email', render: r => <span className="text-xs text-gray-600">{r.email || '—'}</span> },
    { header: 'Role', render: r => <Badge color={{ Admin: 'purple', Manager: 'blue', Staff: 'amber', Customer: 'gray' }[r.role_id?.role_name] || 'gray'}>{r.role_id?.role_name}</Badge> },
    { header: 'Trạng thái', render: r => <Badge color={r.status === 'Active' ? 'green' : 'red'}>{r.status}</Badge> },
    { header: 'Ngày tạo', render: r => <span className="text-xs text-gray-400">{fmtDate(r.createdAt)}</span> },
    { header: 'Thao tác', render: r => (
      <div className="flex gap-2 items-center">
        <button onClick={() => handleToggleBan(r)}
          className={`text-xs px-2 py-1 rounded ${r.status === 'Active' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
          {r.status === 'Active' ? 'Khóa' : 'Mở'}
        </button>
        <select className="text-xs border border-gray-200 rounded px-1 py-0.5" defaultValue={r.role_id?._id}
          onChange={e => handleChangeRole(r, e.target.value)}>
          {roles.map(rl => <option key={rl._id} value={rl._id}>{rl.role_name}</option>)}
        </select>
      </div>
    )},
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Tài khoản</h2>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 shadow-sm">
        <SearchBar value={search} onChange={setSearch} onSearch={fetch} placeholder="Tìm username..." />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <Table columns={columns} data={users} loading={loading} emptyText="Chưa có tài khoản" />
        <div className="px-4 pb-4"><Pagination page={page} total={total} onChange={setPage} /></div>
      </div>
    </div>
  );
}

// ── Suppliers ─────────────────────────────────────────────────────────────────
export function AdminSuppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [selected, setSelected]   = useState(null);
  const [orders, setOrders]       = useState([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [deleting, setDeleting]   = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', contact_person: '', tax_code: '', note: '' });

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supplierAPI.getAll({ page, limit: 20 });
      setSuppliers(data.data || []); setTotal(data.total || 0);
    } catch { toast.error('Lỗi tải nhà cung cấp'); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (selected) { await supplierAPI.update(selected._id, form); toast.success('Đã cập nhật!'); }
      else          { await supplierAPI.create(form); toast.success('Đã thêm!'); }
      setShowModal(false); setSelected(null); fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await supplierAPI.delete(selected._id); toast.success('Đã xóa!'); setShowDelete(false); fetch(); }
    catch (err) { toast.error(err.response?.data?.message || 'Không thể xóa'); }
    finally { setDeleting(false); }
  };

  const openOrders = async (s) => {
    setSelected(s);
    try {
      const { data } = await supplierAPI.getOrders(s._id);
      setOrders(data.data || []);
      setTotalSpent(data.total_spent || 0);
      setShowOrders(true);
    } catch { toast.error('Lỗi'); }
  };

  const columns = [
    { header: 'Nhà cung cấp', render: r => <div><p className="font-semibold text-sm">{r.name}</p><p className="text-xs text-gray-400">{r.contact_person}</p></div> },
    { header: 'SĐT', render: r => r.phone || '—' },
    { header: 'Email', render: r => <span className="text-xs">{r.email || '—'}</span> },
    { header: 'MST', render: r => <span className="font-mono text-xs">{r.tax_code || '—'}</span> },
    { header: 'Trạng thái', render: r => <Badge color={r.is_active ? 'green' : 'red'}>{r.is_active ? 'Hoạt động' : 'Ngừng'}</Badge> },
    { header: 'Thao tác', render: r => (
      <div className="flex gap-2">
        <button onClick={() => openOrders(r)} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">Lịch sử</button>
        <button onClick={() => { setSelected(r); setForm({ name: r.name, phone: r.phone, email: r.email, address: r.address, contact_person: r.contact_person, tax_code: r.tax_code, note: r.note }); setShowModal(true); }}
          className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded">Sửa</button>
        <button onClick={() => { setSelected(r); setShowDelete(true); }} className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded">Xóa</button>
      </div>
    )},
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Nhà cung cấp</h2>
        <button onClick={() => { setSelected(null); setForm({ name: '', phone: '', email: '', address: '', contact_person: '', tax_code: '', note: '' }); setShowModal(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">+ Thêm NCC</button>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <Table columns={columns} data={suppliers} loading={loading} emptyText="Chưa có nhà cung cấp" />
        <div className="px-4 pb-4"><Pagination page={page} total={total} onChange={setPage} /></div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={selected ? 'Sửa NCC' : 'Thêm nhà cung cấp'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tên NCC" required><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></Field>
            <Field label="Người liên hệ"><Input value={form.contact_person || ''} onChange={e => setForm({...form, contact_person: e.target.value})} /></Field>
            <Field label="SĐT"><Input value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} /></Field>
            <Field label="Email"><Input type="email" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} /></Field>
            <Field label="Mã số thuế"><Input value={form.tax_code || ''} onChange={e => setForm({...form, tax_code: e.target.value})} /></Field>
          </div>
          <Field label="Địa chỉ"><Input value={form.address || ''} onChange={e => setForm({...form, address: e.target.value})} /></Field>
          <Field label="Ghi chú"><Input value={form.note || ''} onChange={e => setForm({...form, note: e.target.value})} /></Field>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Hủy</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Lưu</button>
          </div>
        </form>
      </Modal>

      <Modal open={showOrders} onClose={() => setShowOrders(false)} title={`Lịch sử nhập — ${selected?.name}`} size="lg">
        <div className="mb-4 p-3 bg-green-50 rounded-xl text-sm">
          <span className="text-gray-600">Tổng đã nhập: </span>
          <span className="font-bold text-green-700">{fmtVND(totalSpent)}</span>
        </div>
        <div className="space-y-2">
          {orders.map(o => (
            <div key={o._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl text-sm">
              <div>
                <p className="font-mono text-xs text-gray-500">#{o._id.slice(-8)}</p>
                <p className="text-xs text-gray-400">{fmtDate(o.createdAt)}</p>
              </div>
              <span className="font-bold text-gray-800">{fmtVND(o.total_price)}</span>
              <Badge color={o.status === 'Completed' ? 'green' : 'amber'}>{o.status}</Badge>
            </div>
          ))}
          {orders.length === 0 && <p className="text-center text-gray-400 py-8">Chưa có đơn nhập</p>}
        </div>
      </Modal>

      <Confirm open={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete} loading={deleting}
        title="Xóa nhà cung cấp" message={`Xóa "${selected?.name}"?`} />
    </div>
  );
}
