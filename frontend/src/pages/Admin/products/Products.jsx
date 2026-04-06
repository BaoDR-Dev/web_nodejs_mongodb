import React, { useState, useEffect, useCallback, useRef } from 'react';
import { productAPI, categoryAPI, brandAPI, attributeAPI } from '../../../api/services';
import { Table, Badge, Modal, Confirm, Field, Input, Select, Textarea, SearchBar, Pagination, fmtVND } from '../../../components/Common/UI';
import { toast } from '../../../components/Common/Toast';

// ── Upload ảnh thẳng lên Cloudinary từ frontend (không qua backend) ──────────
async function uploadToCloudinary(file) {
  const { data: sig } = await productAPI.getUploadSignature();
  const fd = new FormData();
  fd.append('file', file);
  fd.append('api_key', sig.api_key);
  fd.append('timestamp', sig.timestamp);
  fd.append('signature', sig.signature);
  fd.append('folder', sig.folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloud_name}/image/upload`, {
    method: 'POST', body: fd
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || 'Upload thất bại');
  return json.secure_url;
}

// ── Component chọn & preview ảnh từ thiết bị ─────────────────────────────────
function ImagePicker({ value, onChange }) {
  const inputRef = useRef();
  const [preview, setPreview] = useState(value || '');

  useEffect(() => { setPreview(value || ''); }, [value]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    onChange(file); // trả về File object
  };

  return (
    <div className="flex items-center gap-3">
      <button type="button"
        onClick={() => inputRef.current.click()}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 whitespace-nowrap">
        Chọn ảnh
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {preview && (
        <img src={preview} alt="preview"
          className="w-12 h-12 object-cover rounded-lg border border-gray-200"
          onError={e => e.target.style.display = 'none'} />
      )}
      {!preview && <span className="text-sm text-gray-400">Chưa chọn ảnh</span>}
    </div>
  );
}

export default function AdminProducts() {
  const [products, setProducts]     = useState([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState([]);
  const [brands, setBrands]         = useState([]);
  const [colors, setColors]         = useState([]);
  const [sizes, setSizes]           = useState([]);

  // Create product
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', sku: '', description: '', category_id: '', brand_id: '' });
  const [creating, setCreating]     = useState(false);

  // Edit product
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [editingProduct, setEditingProduct]             = useState(null);
  const [editProductForm, setEditProductForm]           = useState({ name: '', description: '', category_id: '', brand_id: '' });
  const [savingProduct, setSavingProduct]               = useState(false);

  // Delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selected, setSelected]     = useState(null);
  const [deleting, setDeleting]     = useState(false);

  // Detail
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [productDetail, setProductDetail]     = useState(null);

  // Add variant
  const [showAddVariantModal, setShowAddVariantModal] = useState(false);
  const [addVariantForm, setAddVariantForm] = useState({ sku: '', price: '', color_id: '', size_id: '' });
  const [addVariantImageFile, setAddVariantImageFile] = useState(null);
  const [addingVariant, setAddingVariant]   = useState(false);

  // Edit variant
  const [showEditVariantModal, setShowEditVariantModal] = useState(false);
  const [editingVariant, setEditingVariant]             = useState(null);
  const [editVariantForm, setEditVariantForm]           = useState({ sku: '', price: '', color_id: '', size_id: '' });
  const [editVariantImageFile, setEditVariantImageFile] = useState(null);
  const [editVariantPreview, setEditVariantPreview]     = useState('');
  const [savingVariant, setSavingVariant]               = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await productAPI.getAll({ page, limit: 20, name: search || undefined, category_id: categoryId || undefined, show_hidden: true });
      setProducts(data.data || []);
      setTotal(data.total || 0);
    } catch { toast.error('Không thể tải sản phẩm'); }
    finally { setLoading(false); }
  }, [page, search, categoryId]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    Promise.all([
      categoryAPI.getAll({ limit: 1000 }),
      brandAPI.getAll({ limit: 1000 }),
      attributeAPI.get('color'),
      attributeAPI.get('size')
    ])
      .then(([c, b, col, sz]) => {
        setCategories(c.data.data || []);
        // brand controller: { success, count, data: [...] }
        const brandList = Array.isArray(b.data.data) ? b.data.data
                        : Array.isArray(b.data)      ? b.data
                        : [];
        setBrands(brandList);
        setColors(col.data.data || []);
        setSizes(sz.data.data || []);
      }).catch(() => {});
  }, []);

  const refreshDetail = async () => {
    const { data } = await productAPI.getById(productDetail._id);
    setProductDetail(data.data);
  };

  // ── Tạo sản phẩm ──────────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await productAPI.create({
        product: {
          name:        createForm.name,
          sku:         createForm.sku,
          description: createForm.description,
          category_id: createForm.category_id || undefined,
          brand_id:    createForm.brand_id    || undefined,
        },
        variants: []
      });
      toast.success('Đã tạo sản phẩm!');
      setShowCreateModal(false);
      setCreateForm({ name: '', sku: '', description: '', category_id: '', brand_id: '' });
      fetchProducts();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi tạo sản phẩm'); }
    finally { setCreating(false); }
  };

  // ── Toggle sản phẩm ───────────────────────────────────────────────────────
  const handleToggle = async (id) => {
    try {
      await productAPI.toggleStatus(id);
      toast.success('Đã cập nhật trạng thái');
      fetchProducts();
    } catch { toast.error('Lỗi cập nhật'); }
  };

  // ── Toggle variant ────────────────────────────────────────────────────────
  // Đã bỏ — variant không có is_active nữa

  // ── Xóa sản phẩm ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await productAPI.delete(selected._id);
      toast.success('Đã xóa sản phẩm');
      setShowDeleteConfirm(false);
      setSelected(null);
      fetchProducts();
    } catch (err) { toast.error(err.response?.data?.message || 'Không thể xóa'); }
    finally { setDeleting(false); }
  };

  // ── Mở chi tiết ───────────────────────────────────────────────────────────
  const openDetail = async (product) => {
    try {
      const { data } = await productAPI.getById(product._id);
      setProductDetail(data.data);
      setShowDetailModal(true);
    } catch { toast.error('Không tải được chi tiết sản phẩm'); }
  };

  // ── Mở sửa sản phẩm ───────────────────────────────────────────────────────
  const openEditProduct = (product) => {
    setEditingProduct(product);
    setEditProductForm({
      name:        product.name || '',
      description: product.description || '',
      category_id: product.category_id?._id || product.category_id || '',
      brand_id:    product.brand_id?._id    || product.brand_id    || '',
    });
    setShowEditProductModal(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setSavingProduct(true);
    try {
      await productAPI.update(editingProduct._id, editProductForm);
      toast.success('Đã cập nhật sản phẩm!');
      setShowEditProductModal(false);
      fetchProducts();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi cập nhật sản phẩm'); }
    finally { setSavingProduct(false); }
  };

  // ── Thêm variant ──────────────────────────────────────────────────────────
  const handleAddVariant = async (e) => {
    e.preventDefault();
    setAddingVariant(true);
    try {
      const { data: varRes } = await productAPI.addVariant(productDetail._id, {
        sku:      addVariantForm.sku,
        price:    addVariantForm.price,
        color_id: addVariantForm.color_id || undefined,
        size_id:  addVariantForm.size_id  || undefined,
      });
      const newVariantId = varRes.data._id;

      if (addVariantImageFile) {
        const imageUrl = await uploadToCloudinary(addVariantImageFile);
        await productAPI.addImage(newVariantId, { image_url: imageUrl, is_primary: true });
      }

      toast.success('Đã thêm biến thể!');
      setShowAddVariantModal(false);
      setAddVariantForm({ sku: '', price: '', color_id: '', size_id: '' });
      setAddVariantImageFile(null);
      await refreshDetail();
    } catch (err) { toast.error(err.response?.data?.message || err.message || 'Lỗi thêm biến thể'); }
    finally { setAddingVariant(false); }
  };

  // ── Mở sửa variant ────────────────────────────────────────────────────────
  const openEditVariant = (variant) => {
    setEditingVariant(variant);
    setEditVariantForm({
      sku:      variant.sku || '',
      price:    variant.price || '',
      color_id: variant.color_id?._id || variant.color_id || '',
      size_id:  variant.size_id?._id  || variant.size_id  || '',
    });
    setEditVariantImageFile(null);
    setEditVariantPreview(variant.images?.[0]?.image_url || '');
    setShowEditVariantModal(true);
  };

  // ── Lưu sửa variant ───────────────────────────────────────────────────────
  const handleSaveVariant = async (e) => {
    e.preventDefault();
    setSavingVariant(true);
    try {
      await productAPI.updateVariant(editingVariant._id, {
        sku:      editVariantForm.sku,
        price:    editVariantForm.price,
        color_id: editVariantForm.color_id || undefined,
        size_id:  editVariantForm.size_id  || undefined,
      });

      if (editVariantImageFile) {
        // Xóa ảnh cũ trước
        const oldImg = editingVariant.images?.[0];
        if (oldImg?._id) await productAPI.deleteImage(oldImg._id).catch(() => {});
        // Upload ảnh mới thẳng lên Cloudinary
        const imageUrl = await uploadToCloudinary(editVariantImageFile);
        await productAPI.addImage(editingVariant._id, { image_url: imageUrl, is_primary: true });
      }

      toast.success('Đã cập nhật biến thể!');
      setShowEditVariantModal(false);
      await refreshDetail();
    } catch (err) { toast.error(err.response?.data?.message || err.message || 'Lỗi cập nhật biến thể'); }
    finally { setSavingVariant(false); }
  };

  const columns = [
    { header: 'Sản phẩm', render: r => (
      <div>
        <p className="font-semibold text-gray-800 text-sm">{r.name}</p>
        <p className="text-xs text-gray-400 font-mono">{r.sku}</p>
      </div>
    )},
    { header: 'Danh mục',    render: r => r.category_id?.name || '—' },
    { header: 'Thương hiệu', render: r => r.brand_id?.brand_name || r.brand_id?.name || '—' },
    { header: 'Biến thể',    render: r => <span className="font-mono text-sm">{r.variants?.length || 0}</span> },
    { header: 'Trạng thái',  render: r => (
      <Badge color={r.is_active !== false ? 'green' : 'red'}>
        {r.is_active !== false ? 'Đang bán' : 'Ngừng bán'}
      </Badge>
    )},
    { header: 'Thao tác', render: r => (
      <div className="flex items-center gap-2">
        <button onClick={() => openDetail(r)}
          className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100">Chi tiết</button>
        <button onClick={() => openEditProduct(r)}
          className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded hover:bg-amber-100">Sửa</button>
        <button onClick={() => handleToggle(r._id)}
          className={`text-xs px-2 py-1 rounded ${r.is_active !== false
            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
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
        <button onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          + Thêm sản phẩm
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4 flex flex-wrap gap-3">
        <SearchBar value={search} onChange={setSearch} onSearch={fetchProducts} placeholder="Tìm tên, SKU..." />
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

      {/* Create Product Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Thêm sản phẩm mới">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tên sản phẩm" required>
              <Input value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} required placeholder="Áo thun basic" />
            </Field>
            <Field label="SKU" required>
              <Input value={createForm.sku} onChange={e => setCreateForm({ ...createForm, sku: e.target.value })} required placeholder="AT-001" />
            </Field>
            <Field label="Danh mục">
              <Select value={createForm.category_id} onChange={e => setCreateForm({ ...createForm, category_id: e.target.value })}>
                <option value="">Chọn danh mục</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Thương hiệu">
              <Select value={createForm.brand_id} onChange={e => setCreateForm({ ...createForm, brand_id: e.target.value })}>
                <option value="">Chọn thương hiệu</option>
                {brands.map(b => <option key={b._id} value={b._id}>{b.brand_name || b.name}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Mô tả">
            <Textarea value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} placeholder="Mô tả sản phẩm..." />
          </Field>
          <p className="text-xs text-gray-400 italic">* Sau khi tạo, vào Chi tiết để thêm biến thể.</p>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Hủy</button>
            <button type="submit" disabled={creating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60">
              {creating ? 'Đang tạo...' : 'Tạo sản phẩm'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Confirm open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={handleDelete}
        loading={deleting} title="Xóa sản phẩm"
        message={`Bạn có chắc muốn xóa "${selected?.name}"? Hành động này không thể hoàn tác.`} />

      {/* Product Detail Modal */}
      <Modal open={showDetailModal} onClose={() => setShowDetailModal(false)}
        title={`Chi tiết: ${productDetail?.name}`} size="lg">
        {productDetail && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Mã SKU: <span className="font-mono text-gray-800 font-bold">{productDetail.sku}</span></p>
                <p className="text-sm text-gray-500">Danh mục: <span className="font-bold">{productDetail.category_id?.name || '—'}</span></p>
                <p className="text-sm text-gray-500">Thương hiệu: <span className="font-bold">{productDetail.brand_id?.brand_name || productDetail.brand_id?.name || '—'}</span></p>
              </div>
              <button onClick={() => setShowAddVariantModal(true)}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                + Thêm biến thể
              </button>
            </div>

            <h3 className="font-bold text-gray-800">Danh sách Biến thể ({productDetail.variants?.length || 0})</h3>

            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 font-semibold">SKU Biến thể</th>
                    <th className="px-4 py-2 font-semibold text-center">Màu / Size</th>
                    <th className="px-4 py-2 font-semibold text-right">Giá bán</th>
                    <th className="px-4 py-2 font-semibold text-center">Tồn kho</th>
                    <th className="px-4 py-2 font-semibold text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {productDetail.variants?.map((v, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-xs">
                        <div className="flex items-center gap-2">
                          {v.images?.[0]?.image_url
                            ? <img src={v.images[0].image_url} alt="img" className="w-8 h-8 rounded object-cover border" />
                            : <div className="w-8 h-8 rounded border bg-gray-100 flex items-center justify-center text-gray-300 text-xs">?</div>
                          }
                          <span>{v.sku}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Badge color="gray">{v.color_id?.color_name || '-'} / {v.size_id?.size_name || '-'}</Badge>
                      </td>
                      <td className="px-4 py-2 text-right font-semibold">{fmtVND(v.price)}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`font-bold ${v.stock_quantity > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {v.stock_quantity}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button onClick={() => openEditVariant(v)}
                          className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">Sửa</button>
                      </td>
                    </tr>
                  ))}
                  {(!productDetail.variants || productDetail.variants.length === 0) && (
                    <tr><td colSpan="5" className="text-center py-4 text-gray-400">Chưa có biến thể nào</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Variant Modal */}
      <Modal open={showAddVariantModal} onClose={() => setShowAddVariantModal(false)}
        title={`Thêm biến thể — ${productDetail?.name}`} size="sm">
        <form onSubmit={handleAddVariant} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="SKU biến thể" required>
              <Input value={addVariantForm.sku}
                onChange={e => setAddVariantForm({ ...addVariantForm, sku: e.target.value })}
                required placeholder="AT-001-RED-M" />
            </Field>
            <Field label="Giá bán" required>
              <Input type="number" value={addVariantForm.price}
                onChange={e => setAddVariantForm({ ...addVariantForm, price: e.target.value })}
                required placeholder="150000" min={0} />
            </Field>
            <Field label="Màu sắc">
              <Select value={addVariantForm.color_id}
                onChange={e => setAddVariantForm({ ...addVariantForm, color_id: e.target.value })}>
                <option value="">Chọn màu</option>
                {colors.map(c => <option key={c._id} value={c._id}>{c.color_name}</option>)}
              </Select>
            </Field>
            <Field label="Size">
              <Select value={addVariantForm.size_id}
                onChange={e => setAddVariantForm({ ...addVariantForm, size_id: e.target.value })}>
                <option value="">Chọn size</option>
                {sizes.map(s => <option key={s._id} value={s._id}>{s.size_name}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Ảnh biến thể">
            <ImagePicker value="" onChange={setAddVariantImageFile} />
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowAddVariantModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Hủy</button>
            <button type="submit" disabled={addingVariant}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60">
              {addingVariant ? 'Đang lưu...' : 'Thêm biến thể'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Product Modal */}
      <Modal open={showEditProductModal} onClose={() => setShowEditProductModal(false)} title="Sửa thông tin sản phẩm">
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tên sản phẩm" required>
              <Input value={editProductForm.name}
                onChange={e => setEditProductForm({ ...editProductForm, name: e.target.value })}
                required placeholder="Áo thun basic" />
            </Field>
            <Field label="Danh mục">
              <Select value={editProductForm.category_id}
                onChange={e => setEditProductForm({ ...editProductForm, category_id: e.target.value })}>
                <option value="">Chọn danh mục</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Thương hiệu">
              <Select value={editProductForm.brand_id}
                onChange={e => setEditProductForm({ ...editProductForm, brand_id: e.target.value })}>
                <option value="">Chọn thương hiệu</option>
                {brands.map(b => <option key={b._id} value={b._id}>{b.brand_name || b.name}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Mô tả">
            <Textarea value={editProductForm.description}
              onChange={e => setEditProductForm({ ...editProductForm, description: e.target.value })}
              placeholder="Mô tả sản phẩm..." />
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowEditProductModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Hủy</button>
            <button type="submit" disabled={savingProduct}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 disabled:opacity-60">
              {savingProduct ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Variant Modal */}
      <Modal open={showEditVariantModal} onClose={() => setShowEditVariantModal(false)}
        title="Sửa thông tin biến thể" size="sm">
        <form onSubmit={handleSaveVariant} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="SKU biến thể" required>
              <Input value={editVariantForm.sku}
                onChange={e => setEditVariantForm({ ...editVariantForm, sku: e.target.value })}
                required placeholder="AT-001-RED-M" />
            </Field>
            <Field label="Giá bán" required>
              <Input type="number" value={editVariantForm.price}
                onChange={e => setEditVariantForm({ ...editVariantForm, price: e.target.value })}
                required placeholder="150000" min={0} />
            </Field>
            <Field label="Màu sắc">
              <Select value={editVariantForm.color_id}
                onChange={e => setEditVariantForm({ ...editVariantForm, color_id: e.target.value })}>
                <option value="">Chọn màu</option>
                {colors.map(c => <option key={c._id} value={c._id}>{c.color_name}</option>)}
              </Select>
            </Field>
            <Field label="Size">
              <Select value={editVariantForm.size_id}
                onChange={e => setEditVariantForm({ ...editVariantForm, size_id: e.target.value })}>
                <option value="">Chọn size</option>
                {sizes.map(s => <option key={s._id} value={s._id}>{s.size_name}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Ảnh biến thể">
            <ImagePicker value={editVariantPreview} onChange={setEditVariantImageFile} />
            <p className="text-xs text-gray-400 mt-1">Chọn ảnh mới để thay thế ảnh hiện tại.</p>
          </Field>
          <p className="text-xs text-gray-400 italic">* Số lượng tồn kho được quản lý qua phiếu nhập kho.</p>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowEditVariantModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Hủy</button>
            <button type="submit" disabled={savingVariant}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60">
              {savingVariant ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
