import React, { useState, useEffect, useCallback } from 'react';
import { productAPI, categoryAPI, brandAPI, attributeAPI, locationAPI, stockAPI } from '../../../api/services';
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
  const [variantForm, setVariantForm] = useState({ 
    sku: '', price: '', stock_quantity: 0, color_id: '', size_id: '', 
    image_url: '' // Thêm trường này để lưu link ảnh tạm thời
  });

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [locations, setLocations] = useState([]);
  const [productDetail, setProductDetail] = useState(null); 
  const [stockForm, setStockForm] = useState({ 
    variant_id: '', 
    location_id: '', 
    quantity_change: '', 
    reason: 'Nhập kho bổ sung' 
  });

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
      
    // Load danh sách Kệ hàng (Locations)
    locationAPI.getAll().then(res => setLocations(res.data.data || [])).catch(() => {});
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
      const payload = {
        sku: variantForm.sku,
        price: variantForm.price,
        color_id: variantForm.color_id,
        size_id: variantForm.size_id,
        images: variantForm.image_url ? [{ image_url: variantForm.image_url, is_primary: true }] : []
      };

      await productAPI.addVariant(selected._id, payload);
      
      toast.success('Đã thêm biến thể kèm ảnh!');
      setShowVariantModal(false);
      setVariantForm({ sku: '', price: '', stock_quantity: 0, color_id: '', size_id: '', image_url: '' });
      fetch(); 
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Lỗi'); 
    }
  };

  const openDetail = async (product) => {
    try {
      const { data } = await productAPI.getById(product._id);
      setProductDetail(data.data); 
      setShowDetailModal(true);
    } catch (err) { toast.error('Không tải được chi tiết sản phẩm'); }
  };

  const handleAddStock = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        variant_id: stockForm.variant_id,
        location_id: stockForm.location_id,
        movement_type: 'IN', 
        quantity_change: Number(stockForm.quantity_change),
        reason: stockForm.reason
      };

      await stockAPI.recordMovement(payload);
      toast.success('Đã nhập kho và tăng số lượng thành công!');
      
      setShowStockModal(false);
      setStockForm({ variant_id: '', location_id: '', quantity_change: '', reason: 'Nhập kho bổ sung' });
      
      openDetail(productDetail); 
      fetch(); 
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi nhập kho');
    }
  };

  const columns = [
    { header: 'Sản phẩm', render: r => (
      <div>
        <p className="font-semibold text-gray-800 text-sm">{r.name}</p>
        <p className="text-xs text-gray-400 font-mono">{r.sku}</p>
      </div>
    )},
    { header: 'Danh mục', render: r => r.category_id?.name || '—' },
{ header: 'Thương hiệu', render: r => r.brand_id?.name || '—' },    { header: 'Biến thể', render: r => <span className="font-mono text-sm">{r.variants?.length || 0}</span> },
    { header: 'Trạng thái', render: r => (
      <Badge color={r.is_active !== false ? 'green' : 'red'}>{r.is_active !== false ? 'Đang bán' : 'Ngừng bán'}</Badge>
    )},
    { header: 'Thao tác', render: r => (
      <div className="flex items-center gap-2">
        <button onClick={() => openDetail(r)}
          className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100">Chi tiết</button>
      
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

      {/* Create Product Modal */}
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
                {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
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

          <Field label="Link ảnh biến thể (URL)">
            <div className="flex gap-3 items-center">
              <Input 
                value={variantForm.image_url} 
                onChange={e => setVariantForm({...variantForm, image_url: e.target.value})} 
                placeholder="https://ví-dụ.com/anh-ao-thun.jpg" 
              />
              {variantForm.image_url && (
                <img 
                  src={variantForm.image_url} 
                  alt="Preview" 
                  className="w-10 h-10 object-cover rounded border border-gray-200"
                  onError={(e) => e.target.src = 'https://via.placeholder.com/40?text=Lỗi'} 
                />
              )}
            </div>
          </Field>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowVariantModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Hủy</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Thêm biến thể</button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Confirm open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={handleDelete}
        loading={deleting} title="Xóa sản phẩm" message={`Bạn có chắc muốn xóa "${selected?.name}"? Hành động này không thể hoàn tác.`} />

      {/* View Detail & Variants Modal */}
      <Modal open={showDetailModal} onClose={() => setShowDetailModal(false)} title={`Chi tiết: ${productDetail?.name}`} size="lg">
        {productDetail && (
          <div className="space-y-4">
            <div className="flex gap-4 mb-4">
              <div className="bg-gray-50 p-3 rounded-lg flex-1">
                <p className="text-sm text-gray-500">Mã SKU: <span className="font-mono text-gray-800 font-bold">{productDetail.sku}</span></p>
                <p className="text-sm text-gray-500">Danh mục: <span className="font-bold">{productDetail.category_id?.name}</span></p>
               <p className="text-sm text-gray-500">Thương hiệu: <span className="font-bold">{productDetail.brand_id?.name}</span></p>

              </div>
            </div>

            <h3 className="font-bold text-gray-800">Danh sách Biến thể ({productDetail.variants?.length})</h3>
            
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 font-semibold">SKU Biến thể</th>
                    <th className="px-4 py-2 font-semibold text-center">Màu / Size</th>
                    <th className="px-4 py-2 font-semibold text-right">Giá bán</th>
                    <th className="px-4 py-2 font-semibold text-center text-blue-600">Tồn kho</th>
                    <th className="px-4 py-2 font-semibold text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {productDetail.variants?.map((v, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-xs">
                        <div className="flex items-center gap-2">
                          {v.images?.[0]?.image_url && (
                             <img src={v.images[0].image_url} alt="img" className="w-8 h-8 rounded object-cover border" />
                          )}
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
                        <button onClick={() => { 
                            setStockForm({ ...stockForm, variant_id: v._id }); 
                            setShowStockModal(true); 
                          }}
                          className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600">
                          + Nhập hàng
                        </button>
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

      {/* Quick Add Stock Modal */}
      <Modal open={showStockModal} onClose={() => setShowStockModal(false)} title="Nhập hàng / Tăng số lượng" size="sm">
        <form onSubmit={handleAddStock} className="space-y-4">
          <Field label="Cất vào Kệ hàng nào?" required>
            <Select value={stockForm.location_id} onChange={e => setStockForm({...stockForm, location_id: e.target.value})} required>
              <option value="">-- Chọn Kệ hàng (Location) --</option>
              {locations.map(loc => (
                <option key={loc._id} value={loc._id}>
                  {loc.location_name} (Thuộc: {loc.warehouse_id?.warehouse_name})
                </option>
              ))}
            </Select>
            <p className="text-xs text-amber-600 mt-1">*Hàng hóa bắt buộc phải được xếp lên kệ</p>
          </Field>

          <Field label="Số lượng cất thêm" required>
            <Input type="number" value={stockForm.quantity_change} onChange={e => setStockForm({...stockForm, quantity_change: e.target.value})} required min={1} placeholder="VD: 50" />
          </Field>

          <Field label="Lý do / Nguồn hàng">
            <Input value={stockForm.reason} onChange={e => setStockForm({...stockForm, reason: e.target.value})} placeholder="VD: Nhập hàng từ NCC A" />
          </Field>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowStockModal(false)} className="px-4 py-2 border rounded-lg text-sm">Hủy</button>
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Xác nhận Nhập</button>
          </div>
        </form>
      </Modal>

    </div>
  );
}