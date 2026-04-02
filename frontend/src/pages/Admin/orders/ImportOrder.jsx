import React, { useState, useEffect, useCallback } from 'react';
import { supplierAPI, productAPI, locationAPI, orderAPI } from '../../../api/services';
import { Table, Modal, Field, Input, Select, Badge, fmtVND, fmtDate, Pagination } from '../../../components/Common/UI';
import { toast } from '../../../components/Common/Toast';

const STATUS_COLORS = { Draft: 'amber', Completed: 'green', Cancelled: 'red' };
const STATUS_LABELS = { Draft: 'Chờ xử lý', Completed: 'Hoàn thành', Cancelled: 'Đã hủy' };

export default function AdminImportOrder() {
  const [activeTab, setActiveTab] = useState('list');
  const [importOrders, setImportOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const [suppliers, setSuppliers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [products, setProducts]   = useState([]); // Danh sách variants để chọn
  
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [supplierNote, setSupplierNote] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');

  // "Giỏ hàng" nhập kho: Danh sách các sản phẩm đang chờ nhập
  const [importCart, setImportCart] = useState([]);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [searchPro, setSearchPro] = useState('');

  // Fetch import orders
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await orderAPI.getAll({ page, limit: 20, order_type: 'IN' });
      setImportOrders(data.data || []);
      setTotal(data.total || 0);
    } catch { toast.error('Không tải được đơn nhập kho'); }
    finally { setLoading(false); }
  }, [page]);

  const openDetail = async (order) => {
    try {
      const { data } = await orderAPI.getById(order._id);
      setSelected(data.data);
      setShowDetail(true);
    } catch { toast.error('Không tải được chi tiết đơn nhập'); }
  };

  // 1. Load dữ liệu ban đầu: NCC, Kệ hàng, và Danh sách biến thể
  useEffect(() => {
    if (activeTab === 'list') {
      fetchOrders();
    } else {
      supplierAPI.getAll({ is_active: true }).then(res => setSuppliers(res.data.data || []));
      locationAPI.getAll({ status: 'Active' }).then(res => setLocations(res.data.data || []));
      // Lấy danh sách sản phẩm (Search trống để lấy các biến thể)
      productAPI.getAll({ limit: 100 }).then(res => {
        // Backend của bạn trả về Product, ta cần bóc tách các variants ra để chọn
        const allVariants = [];
        res.data.data.forEach(p => {
          p.variants.forEach(v => {
            allVariants.push({ ...v, product_name: p.name });
          });
        });
        setProducts(allVariants);
      });
    }
  }, [activeTab, fetchOrders]);

  // 2. Thêm một sản phẩm vào danh sách nhập kho
  const addToCart = (variant) => {
    const exists = importCart.find(item => item.variant_id === variant._id);
    if (exists) {
      toast.error('Sản phẩm này đã có trong danh sách nhập');
      return;
    }
    setImportCart([...importCart, {
      variant_id: variant._id,
      sku: variant.sku,
      product_name: variant.product_name,
      import_price: variant.price, // Mặc định lấy giá bán làm giá nhập, có thể sửa
      // Mỗi sản phẩm có thể chia vào nhiều kệ khác nhau
      locations: [{ location_id: '', quantity: 1 }] 
    }]);
    setShowProductPicker(false);
  };

  // 3. Xử lý thay đổi thông tin trong hàng chờ
  const updateItem = (index, field, value) => {
    const newCart = [...importCart];
    newCart[index][field] = value;
    setImportCart(newCart);
  };

  const updateLocation = (itemIndex, locIndex, field, value) => {
    const newCart = [...importCart];
    newCart[itemIndex].locations[locIndex][field] = value;
    setImportCart(newCart);
  };

  const addLocationRow = (itemIndex) => {
    const newCart = [...importCart];
    newCart[itemIndex].locations.push({ location_id: '', quantity: 1 });
    setImportCart(newCart);
  };

  const removeItem = (index) => {
    setImportCart(importCart.filter((_, i) => i !== index));
  };

  // 4. Gửi đơn nhập hàng về Backend
  const handleSubmit = async () => {
    if (!selectedSupplier) return toast.error('Vui lòng chọn Nhà cung cấp');
    if (importCart.length === 0) return toast.error('Danh sách nhập kho đang trống');

    // Kiểm tra dữ liệu kệ hàng
    for (const item of importCart) {
      if (item.locations.some(l => !l.location_id || l.quantity <= 0)) {
        return toast.error(`Vui lòng kiểm tra lại số lượng và kệ hàng của sản phẩm ${item.sku}`);
      }
    }

    setLoading(true);
    try {
      const payload = {
        supplier_id: selectedSupplier,
        supplier_note: supplierNote,
        invoice_number: invoiceNumber,
        items: importCart // Cấu trúc này khớp 100% với Backend createImportOrder
      };

      await orderAPI.import(payload);
      toast.success('Nhập kho thành công! Tồn kho đã được cập nhật.');
      // Reset form
      setImportCart([]);
      setSupplierNote('');
      setInvoiceNumber('');
      setSelectedSupplier('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi nhập hàng');
    } finally {
      setLoading(false);
    }
  };

  // Tính tổng tiền đơn nhập
  const totalOrderAmount = importCart.reduce((sum, item) => {
    const itemQty = item.locations.reduce((s, l) => s + Number(l.quantity), 0);
    return sum + (item.import_price * itemQty);
  }, 0);

  return (
    <div className="pb-20">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Quản lý nhập kho</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        <button onClick={() => setActiveTab('list')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          Danh sách đơn nhập
        </button>
        <button onClick={() => setActiveTab('create')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'create' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          Tạo đơn nhập mới
        </button>
      </div>

      {activeTab === 'list' ? (
        <div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <Table columns={[
              { header: '#', render: r => <span className="font-mono text-xs">{r._id.slice(-8)}</span> },
              { header: 'Nhà cung cấp', render: r => r.supplier_id?.name || '—' },
              { header: 'Tổng tiền', render: r => <span className="font-bold text-green-600">{fmtVND(r.total_amount)}</span> },
              { header: 'Trạng thái', render: r => <Badge color={STATUS_COLORS[r.status]}>{STATUS_LABELS[r.status] || r.status}</Badge> },
              { header: 'Ngày tạo', render: r => <span className="text-xs text-gray-400">{fmtDate(r.createdAt)}</span> },
              { header: 'Thao tác', render: r => (
                <button onClick={() => openDetail(r)}
                  className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">Chi tiết</button>
              )},
            ]} data={importOrders} loading={loading} emptyText="Chưa có đơn nhập kho" />
          </div>
          <Pagination current={page} total={total} pageSize={20} onChange={setPage} />
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Tạo phiếu nhập kho (IN)</h3>
            <button onClick={handleSubmit} disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg transition-all disabled:opacity-50">
              {loading ? 'Đang xử lý...' : 'Xác nhận nhập kho'}
            </button>
          </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* BÊN TRÁI: THÔNG TIN CHUNG */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-800 border-b pb-2">1. Thông tin chung</h3>
            <Field label="Nhà cung cấp" required>
              <Select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)} required>
                <option value="">-- Chọn nhà cung cấp --</option>
                {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label="Mã hóa đơn (VAT)">
              <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="VD: VAT-12345" />
            </Field>
            <Field label="Ghi chú đơn nhập">
              <Textarea value={supplierNote} onChange={e => setSupplierNote(e.target.value)} placeholder="Nhập ghi chú cho lô hàng này..." />
            </Field>
          </div>

          <div className="bg-blue-600 p-5 rounded-2xl text-white shadow-lg">
            <p className="text-sm opacity-80">Tổng tiền thanh toán</p>
            <h2 className="text-3xl font-black">{fmtVND(totalOrderAmount)}</h2>
            <p className="text-xs mt-2 italic">* Tồn kho sẽ tự động tăng sau khi xác nhận</p>
          </div>
        </div>

        {/* BÊN PHẢI: DANH SÁCH SẢN PHẨM */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800">2. Danh sách sản phẩm nhập</h3>
              <button onClick={() => setShowProductPicker(true)}
                className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100">
                + Thêm sản phẩm
              </button>
            </div>

            <div className="space-y-4">
              {importCart.map((item, idx) => (
                <div key={idx} className="p-4 border border-gray-100 rounded-2xl bg-gray-50 relative group">
                  <button onClick={() => removeItem(idx)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500">✕</button>
                  
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="font-bold text-gray-800">{item.product_name}</p>
                      <p className="text-xs font-mono text-gray-500">SKU: {item.sku}</p>
                    </div>
                    <Field label="Giá nhập (₫)">
                      <Input type="number" value={item.import_price} onChange={e => updateItem(idx, 'import_price', e.target.value)} />
                    </Field>
                  </div>

                  <div className="space-y-2 bg-white p-3 rounded-xl border border-gray-200">
                    <p className="text-xs font-bold text-gray-500 uppercase">Phân bổ kệ hàng & Số lượng:</p>
                    {item.locations.map((loc, lIdx) => (
                      <div key={lIdx} className="flex gap-2 items-center">
                        <select value={loc.location_id} onChange={e => updateLocation(idx, lIdx, 'location_id', e.target.value)}
                          className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm">
                          <option value="">-- Chọn Kệ --</option>
                          {locations.map(l => <option key={l._id} value={l._id}>{l.location_name} ({l.warehouse_id?.warehouse_name})</option>)}
                        </select>
                        <input type="number" value={loc.quantity} onChange={e => updateLocation(idx, lIdx, 'quantity', e.target.value)}
                          className="w-24 px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-bold" min="1" />
                        {lIdx === item.locations.length - 1 && (
                          <button onClick={() => addLocationRow(idx)} className="text-blue-600 font-bold text-lg px-2">+</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {importCart.length === 0 && (
                <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-2xl text-gray-400">
                  Chưa có sản phẩm nào. Bấm "Thêm sản phẩm" để bắt đầu nhập hàng.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal chọn sản phẩm (Variant Picker) */}
      <Modal open={showProductPicker} onClose={() => setShowProductPicker(false)} title="Chọn sản phẩm nhập kho" size="md">
        <div className="mb-4">
          <Input placeholder="Tìm kiếm theo tên hoặc mã SKU..." value={searchPro} onChange={e => setSearchPro(e.target.value)} />
        </div>
        <div className="max-h-96 overflow-y-auto space-y-2">
          {products.filter(v => v.sku.toLowerCase().includes(searchPro.toLowerCase()) || v.product_name.toLowerCase().includes(searchPro.toLowerCase()))
            .map(v => (
              <div key={v._id} onClick={() => addToCart(v)}
                className="flex justify-between items-center p-3 border rounded-xl hover:bg-blue-50 cursor-pointer transition-all">
                <div>
                  <p className="font-bold text-sm text-gray-800">{v.product_name}</p>
                  <p className="text-xs text-gray-500">Mã: {v.sku} | Giá bán: {fmtVND(v.price)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Tồn hiện tại</p>
                  <p className="font-bold text-blue-600">{v.stock_quantity}</p>
                </div>
              </div>
            ))}
        </div>
      </Modal>
        </div>
      )}

      {/* Detail Modal */}
      <Modal open={showDetail} onClose={() => setShowDetail(false)} title={`Đơn nhập kho #${selected?._id?.slice(-10)}`} size="lg">
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center">
              <Badge color={STATUS_COLORS[selected.status]}>{STATUS_LABELS[selected.status] || selected.status}</Badge>
              <span className="text-gray-500">{fmtDate(selected.createdAt)}</span>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 space-y-2">
              <p><strong>Nhà cung cấp:</strong> {selected.supplier_id?.name}</p>
              <p><strong>Mã hóa đơn:</strong> {selected.invoice_number || '—'}</p>
              <p><strong>Ghi chú:</strong> {selected.supplier_note || '—'}</p>
            </div>
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 text-xs">
                  <tr><th className="px-3 py-2 text-left">Sản phẩm</th><th className="px-3 py-2 text-center">SL</th><th className="px-3 py-2 text-right">Giá nhập</th><th className="px-3 py-2 text-right">T.Tiền</th></tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {selected.details?.map((d, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{d.variant_id?.product_id?.name || d.variant_id?.sku}</td>
                      <td className="px-3 py-2 text-center">{d.quantity}</td>
                      <td className="px-3 py-2 text-right">{fmtVND(d.unit_price)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{fmtVND(d.unit_price * d.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex justify-between font-bold text-base"><span>Tổng tiền</span><span className="text-blue-600">{fmtVND(selected.total_amount)}</span></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// Thêm cái Textarea component hỗ trợ
const Textarea = (props) => (
  <textarea {...props} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[100px] focus:ring-2 focus:ring-blue-500 outline-none" />
);