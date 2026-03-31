import React, { useState, useEffect, useCallback } from 'react';
import { productAPI, categoryAPI, brandAPI, attributeAPI } from '../../../api/services';
import { Table, Badge, Modal, Confirm, Field, Input, Select, Textarea, SearchBar, Pagination, fmtVND, fmtDate, statusColor, PageLoader, Empty } from '../../../components/Common/UI';
import { toast } from '../../../components/Common/Toast';

export default function AdminProducts() {
  const [products, setProducts]   = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState([]);
  const [brands, setBrands]       = useState([]);
  const [colors, setColors]       = useState([]);
  const [sizes, setSizes]         = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selected, setSelected]   = useState(null);
  const [deleting, setDeleting]   = useState(false);

  const [form, setForm] = useState({ name: '', sku: '', description: '', category_id: '', brand_id: '' });
  const [variantForm, setVariantForm] = useState({ sku: '', price: '', stock_quantity: 0, color_id: '', size_id: '' });

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await productAPI.getAll({ page, limit: 20, name: search || undefined, category_id: categoryId || undefined });
      setProducts(data.data || []);
      setTotal(data.total || 0);
    } catch { toast.error('Không thể tải sản phẩm'); }
    finally { setLoading(false); }
  }, [page, search, categoryId]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    Promise.all([categoryAPI.getAll(), brandAPI.getAll(), attributeAPI.get('color'), attributeAPI.get('size')])
      .then(([c, b, col, sz]) => {
        setCategories(c.data.data || []);
        setBrands(b.data.data || []);
        setColors(col.data.data || []);
        setSizes(sz.data.data || []);
      }).catch(() => {});
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await productAPI.create(form);
      toast.success('Đã tạo sản phẩm!');
      setShowModal(false);
      setForm({ name: '', sku: '', description: '', category_id: '', brand_id: '' });
      fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
  };

  const handleToggle = async (id) => {
    try {
      await productAPI.toggleStatus(id);
      toast.success('Đã cập nhật trạng thái');
      fetch();
    } catch { toast.error('Lỗi cập nhật'); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await productAPI.delete(selected._id);
      toast.success('Đã xóa sản phẩm');
      setShowDeleteConfirm(false);
      setSelected(null);
      fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Không thể xóa'); }
    finally { setDeleting(false); }
  };

  const handleAddVariant = async (e) => {
    e.preventDefault();
    try {
      await productAPI.addVariant(selected._id, variantForm);
      toast.success('Đã thêm biến thể!');
      setShowVariantModal(false);
      setVariantForm({ sku: '', price: '', stock_quantity: 0, color_id: '', size_id: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
  };

  const columns = [
    { header: 'Sản phẩm', render: r => (
      <div>
        <p className="font-semibold text-gray-800 text-sm">{r.name}</p>
        <p className="text-xs text-gray-400 font-mono">{r.sku}</p>
      </div>
    )},
    { header: 'Danh mục', render: r => r.category_id?.name || '—' },
    { header: 'Thương hiệu', render: r => r.brand_id?.brand_name || '—' },
    { header: 'Biến thể', render: r => <span className="font-mono text-sm">{r.variants?.length || 0}</span> },
    { header: 'Trạng thái', render: r => (
      <Badge color={r.is_active !== false ? 'green' : 'red'}>{r.is_active !== false ? 'Đang bán' : 'Ngừng bán'}</Badge>
    )},
    { header: 'Thao tác', render: r => (
      <div className="flex items-center gap-2">
        <button onClick={() => { setSelected(r); setShowVariantModal(true); }}
          className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">+ Biến thể</button>
        <button onClick={() => handleToggle(r._id)}
          className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded hover:bg-amber-100">
          {r.is_active !== false ? 'Ẩn' : 'Hiện'}
        </button>
        <button onClick={() => { setSelected(r); setShowDeleteConfirm(true); }}
          className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100">Xóa</button>
      </div>
    )},
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Sản phẩm</h2>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          + Thêm sản phẩm
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4 flex flex-wrap gap-3">
        <SearchBar value={search} onChange={setSearch} onSearch={fetch} placeholder="Tìm tên, SKU..." />
        <select value={categoryId} onChange={e => { setCategoryId(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">Tất cả danh mục</option>
          {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <Table columns={columns} data={products} loading={loading} emptyText="Chưa có sản phẩm nào" />
        <div className="px-4 pb-4">
          <Pagination page={page} total={total} onChange={setPage} />
        </div>
      </div>

      {/* Create Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Thêm sản phẩm mới">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tên sản phẩm" required>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="Tên sản phẩm" />
            </Field>
            <Field label="SKU" required>
              <Input value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} required placeholder="SKU-001" />
            </Field>
            <Field label="Danh mục">
              <Select value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}>
                <option value="">Chọn danh mục</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Thương hiệu">
              <Select value={form.brand_id} onChange={e => setForm({...form, brand_id: e.target.value})}>
                <option value="">Chọn thương hiệu</option>
                {brands.map(b => <option key={b._id} value={b._id}>{b.brand_name}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Mô tả">
            <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Mô tả sản phẩm..." />
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Hủy</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Tạo sản phẩm</button>
          </div>
        </form>
      </Modal>

      {/* Add Variant Modal */}
      <Modal open={showVariantModal} onClose={() => setShowVariantModal(false)} title={`Thêm biến thể — ${selected?.name}`}>
        <form onSubmit={handleAddVariant} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="SKU biến thể" required>
              <Input value={variantForm.sku} onChange={e => setVariantForm({...variantForm, sku: e.target.value})} required placeholder="SKU-001-RED-M" />
            </Field>
            <Field label="Giá bán" required>
              <Input type="number" value={variantForm.price} onChange={e => setVariantForm({...variantForm, price: e.target.value})} required placeholder="150000" min={0} />
            </Field>
            <Field label="Màu sắc">
              <Select value={variantForm.color_id} onChange={e => setVariantForm({...variantForm, color_id: e.target.value})}>
                <option value="">Chọn màu</option>
                {colors.map(c => <option key={c._id} value={c._id}>{c.color_name}</option>)}
              </Select>
            </Field>
            <Field label="Size">
              <Select value={variantForm.size_id} onChange={e => setVariantForm({...variantForm, size_id: e.target.value})}>
                <option value="">Chọn size</option>
                {sizes.map(s => <option key={s._id} value={s._id}>{s.size_name}</option>)}
              </Select>
            </Field>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowVariantModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Hủy</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Thêm biến thể</button>
          </div>
        </form>
      </Modal>

      <Confirm open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={handleDelete}
        loading={deleting} title="Xóa sản phẩm" message={`Bạn có chắc muốn xóa "${selected?.name}"? Hành động này không thể hoàn tác.`} />
    </div>
  );
}
