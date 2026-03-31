import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { productAPI, cartAPI, categoryAPI, voucherAPI, orderAPI, paymentAPI, reviewAPI } from '../../api/services';
import { Modal, Field, Input, Select, Badge, fmtVND, fmtDate, Spinner, PageLoader, Pagination } from '../../components/Common/UI';
import { toast } from '../../components/Common/Toast';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

// ── ProductCard ────────────────────────────────────────────────────────────────
function ProductCard({ product }) {
  const { isCustomer } = useAuth();
  const { fetchCount } = useCart();
  const variant = product.variants?.[0];
  const image   = variant?.images?.find(i => i.is_primary)?.image_url || variant?.images?.[0]?.image_url;

  const addToCart = async (e) => {
    e.preventDefault();
    if (!isCustomer) { toast.info('Vui lòng đăng nhập để mua hàng'); return; }
    if (!variant) { toast.error('Sản phẩm chưa có biến thể'); return; }
    try {
      await cartAPI.add({ variant_id: variant._id, quantity: 1 });
      toast.success('Đã thêm vào giỏ!');
      fetchCount();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
  };

  return (
    <Link to={`/products/${product._id}`} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5">
      <div className="aspect-square bg-gray-50 overflow-hidden">
        {image ? (
          <img src={image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-gray-200">👕</div>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs text-gray-400 mb-1">{product.brand_id?.brand_name}</p>
        <p className="font-semibold text-gray-800 text-sm leading-snug mb-2 line-clamp-2">{product.name}</p>
        <div className="flex items-center justify-between">
          <span className="font-bold text-blue-600">{variant ? fmtVND(variant.price) : 'Liên hệ'}</span>
          <button onClick={addToCart} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition">
            + Giỏ
          </button>
        </div>
      </div>
    </Link>
  );
}

// ── Home / Product List ────────────────────────────────────────────────────────
export function HomePage() {
  const [products, setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [catId, setCatId]         = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await productAPI.getAll({ page, limit: 16, name: search || undefined, category_id: catId || undefined });
      setProducts(data.data || []);
      setTotal(data.total || 0);
    } catch { toast.error('Lỗi tải sản phẩm'); }
    finally { setLoading(false); }
  }, [page, search, catId]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => {
    categoryAPI.getAll().then(r => setCategories(r.data.data || [])).catch(() => {});
  }, []);

  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 mb-8 text-white">
        <p className="text-sm font-medium opacity-80 mb-2">Fashion Store</p>
        <h1 className="text-3xl font-bold mb-3">Thời trang phong cách</h1>
        <p className="opacity-80 text-sm">Khám phá hàng ngàn sản phẩm thời trang chất lượng</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (setPage(1), fetch())}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Tìm kiếm sản phẩm..." />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          <button onClick={() => { setCatId(''); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap ${!catId ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            Tất cả
          </button>
          {categories.map(c => (
            <button key={c._id} onClick={() => { setCatId(c._id); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap ${catId === c._id ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? <PageLoader /> : (
        <>
          {products.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-4xl mb-3">😕</p>
              <p>Không tìm thấy sản phẩm</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map(p => <ProductCard key={p._id} product={p} />)}
            </div>
          )}
          <Pagination page={page} total={total} limit={16} onChange={setPage} />
        </>
      )}
    </div>
  );
}

// ── Product Detail ─────────────────────────────────────────────────────────────
export function ProductDetailPage() {
  const { id }  = useParams();
  const { isCustomer } = useAuth();
  const { fetchCount } = useCart();
  const [product, setProduct]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [selectedVariant, setSelected] = useState(null);
  const [qty, setQty]             = useState(1);
  const [reviews, setReviews]     = useState([]);
  const [adding, setAdding]       = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [pRes, rRes] = await Promise.all([
          productAPI.getById(id),
          reviewAPI.getByProduct(id, { limit: 10 })
        ]);
        setProduct(pRes.data.data);
        setSelected(pRes.data.data.variants?.[0]);
        setReviews(rRes.data.data || []);
      } catch { toast.error('Không tải được sản phẩm'); }
      finally { setLoading(false); }
    };
    load();
  }, [id]);

  const addToCart = async () => {
    if (!isCustomer) { toast.info('Vui lòng đăng nhập'); return; }
    if (!selectedVariant) { toast.error('Chọn biến thể'); return; }
    setAdding(true);
    try {
      await cartAPI.add({ variant_id: selectedVariant._id, quantity: qty });
      toast.success('Đã thêm vào giỏ!');
      fetchCount();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
    finally { setAdding(false); }
  };

  if (loading) return <PageLoader />;
  if (!product) return <div className="text-center py-20 text-gray-400">Không tìm thấy sản phẩm</div>;

  const image = selectedVariant?.images?.find(i => i.is_primary)?.image_url;

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        {/* Image */}
        <div className="aspect-square bg-gray-50 rounded-2xl overflow-hidden">
          {image ? (
            <img src={image} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl text-gray-200">👕</div>
          )}
        </div>

        {/* Info */}
        <div>
          <p className="text-sm text-gray-500 mb-1">{product.brand_id?.brand_name} · {product.category_id?.name}</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>
          <p className="text-3xl font-bold text-blue-600 mb-4">{selectedVariant ? fmtVND(selectedVariant.price) : '—'}</p>

          {product.description && <p className="text-gray-600 text-sm mb-6 leading-relaxed">{product.description}</p>}

          {/* Variants */}
          {product.variants?.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Biến thể</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map(v => (
                  <button key={v._id} onClick={() => setSelected(v)}
                    className={`px-3 py-1.5 border rounded-lg text-sm ${selectedVariant?._id === v._id ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-400'}`}>
                    {v.color_id?.color_name} {v.size_id?.size_name} — {fmtVND(v.price)}
                    {v.stock_quantity <= 0 && <span className="ml-1 text-red-400">(Hết)</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Qty */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2 hover:bg-gray-50 text-lg font-bold">−</button>
              <span className="px-4 py-2 font-mono font-bold">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="px-3 py-2 hover:bg-gray-50 text-lg font-bold">+</button>
            </div>
            <span className="text-sm text-gray-500">Còn {selectedVariant?.stock_quantity || 0} sản phẩm</span>
          </div>

          <button onClick={addToCart} disabled={adding || !selectedVariant || selectedVariant?.stock_quantity <= 0}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-60 flex items-center justify-center gap-2">
            {adding ? <Spinner size="sm" /> : '🛒 Thêm vào giỏ hàng'}
          </button>
        </div>
      </div>

      {/* Reviews */}
      {reviews.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-4">Đánh giá ({reviews.length})</h2>
          <div className="space-y-3">
            {reviews.map(r => (
              <div key={r._id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                    {r.user_id?.username?.[0]?.toUpperCase()}
                  </div>
                  <span className="font-medium text-sm">{r.user_id?.username}</span>
                  <span className="text-yellow-400">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                </div>
                <p className="text-sm text-gray-600">{r.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Cart ───────────────────────────────────────────────────────────────────────
export function CartPage() {
  const navigate = useNavigate();
  const { fetchCount } = useCart();
  const [cart, setCart]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [voucher, setVoucher]     = useState('');
  const [voucherData, setVoucherData] = useState(null);
  const [checkingVoucher, setCheckingVoucher] = useState(false);
  const [payMethod, setPayMethod] = useState('Cash');
  const [address, setAddress]     = useState('');
  const [ordering, setOrdering]   = useState(false);

  const fetchCart = async () => {
    try {
      const { data } = await cartAPI.get();
      setCart(data.data);
    } catch { toast.error('Lỗi tải giỏ hàng'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCart(); }, []);

  const handleUpdate = async (itemId, qty) => {
    try {
      await cartAPI.update(itemId, { quantity: qty });
      fetchCart(); fetchCount();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
  };

  const handleRemove = async (itemId) => {
    try {
      await cartAPI.remove(itemId);
      fetchCart(); fetchCount();
      toast.success('Đã xóa!');
    } catch { toast.error('Lỗi xóa'); }
  };

  const handleCheckVoucher = async () => {
    if (!voucher.trim()) return;
    setCheckingVoucher(true);
    try {
      const { data } = await voucherAPI.apply({ code: voucher.trim(), order_total: cart?.total || 0 });
      setVoucherData(data.data);
      toast.success(`Áp dụng thành công! Giảm ${fmtVND(data.data.discount_amount)}`);
    } catch (err) {
      setVoucherData(null);
      toast.error(err.response?.data?.message || 'Voucher không hợp lệ');
    } finally { setCheckingVoucher(false); }
  };

  const handleOrder = async () => {
    if (!cart?.items?.length) { toast.error('Giỏ hàng trống'); return; }
    setOrdering(true);
    try {
      const items = cart.items.map(i => ({ variant_id: i.variant._id, quantity: i.quantity }));
      const { data } = await orderAPI.create({
        items,
        payment_method: payMethod,
        voucher_code: voucherData ? voucher : undefined,
        shipping_address: address,
      });

      if (payMethod === 'Momo') {
        // Lấy payUrl MoMo
        const momoRes = await paymentAPI.createMomo({ order_id: data.data.order_id });
        window.location.href = momoRes.data.pay_url;
      } else {
        toast.success('Đặt hàng thành công!');
        fetchCount();
        navigate('/orders');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đặt hàng thất bại');
    } finally { setOrdering(false); }
  };

  if (loading) return <PageLoader />;

  const items  = cart?.items || [];
  const total  = cart?.total || 0;
  const finalTotal = voucherData ? voucherData.final_total : total;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Giỏ hàng ({items.length} sản phẩm)</h1>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🛒</p>
          <p className="text-gray-500 mb-4">Giỏ hàng trống</p>
          <Link to="/" className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700">Mua sắm ngay</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items */}
          <div className="lg:col-span-2 space-y-3">
            {items.map(item => (
              <div key={item._id} className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4">
                <div className="w-20 h-20 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0">
                  {item.image_url
                    ? <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-2xl text-gray-200">👕</div>
                  }
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{item.variant?.product_id?.name}</p>
                  <p className="text-xs text-gray-500 mb-2">{item.variant?.color_id?.color_name} · {item.variant?.size_id?.size_name}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                      <button onClick={() => handleUpdate(item._id, Math.max(1, item.quantity - 1))} className="px-2 py-1 hover:bg-gray-50 font-bold">−</button>
                      <span className="px-3 py-1 font-mono text-sm">{item.quantity}</span>
                      <button onClick={() => handleUpdate(item._id, item.quantity + 1)} className="px-2 py-1 hover:bg-gray-50 font-bold">+</button>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600">{fmtVND(item.subtotal)}</p>
                      {!item.in_stock && <p className="text-xs text-red-500">Không đủ hàng</p>}
                    </div>
                    <button onClick={() => handleRemove(item._id)} className="text-gray-400 hover:text-red-500 text-xl leading-none">×</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="space-y-4">
            {/* Voucher */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="font-semibold text-sm mb-3">Mã giảm giá</p>
              <div className="flex gap-2">
                <input value={voucher} onChange={e => setVoucher(e.target.value.toUpperCase())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập mã..." />
                <button onClick={handleCheckVoucher} disabled={checkingVoucher}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-900 disabled:opacity-60">
                  {checkingVoucher ? '...' : 'Áp dụng'}
                </button>
              </div>
              {voucherData && (
                <div className="mt-2 p-2 bg-green-50 rounded-lg text-xs text-green-700">
                  ✓ Giảm {fmtVND(voucherData.discount_amount)}
                </div>
              )}
            </div>

            {/* Address */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="font-semibold text-sm mb-2">Địa chỉ giao hàng</p>
              <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập địa chỉ..." />
            </div>

            {/* Payment */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="font-semibold text-sm mb-3">Thanh toán</p>
              <div className="space-y-2">
                {['Cash', 'COD', 'Transfer', 'Momo'].map(m => (
                  <label key={m} className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" name="pay" value={m} checked={payMethod === m} onChange={() => setPayMethod(m)} className="text-blue-600" />
                    <span className="text-sm">{m === 'Cash' ? '💵 Tiền mặt' : m === 'COD' ? '📦 COD' : m === 'Transfer' ? '🏦 Chuyển khoản' : '💜 MoMo'}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Tạm tính</span><span>{fmtVND(total)}</span></div>
                {voucherData && <div className="flex justify-between text-green-600"><span>Giảm giá</span><span>-{fmtVND(voucherData.discount_amount)}</span></div>}
                <div className="flex justify-between font-bold text-base border-t pt-2"><span>Tổng cộng</span><span className="text-blue-600">{fmtVND(finalTotal)}</span></div>
              </div>
              <button onClick={handleOrder} disabled={ordering}
                className="w-full mt-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2">
                {ordering ? <Spinner size="sm" /> : `Đặt hàng ${payMethod === 'Momo' ? '→ MoMo' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── My Orders ─────────────────────────────────────────────────────────────────
export function MyOrdersPage() {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [tab, setTab]         = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await orderAPI.myOrders({ status: tab || undefined, limit: 50 });
        setOrders(data.data || []);
      } catch { toast.error('Lỗi tải đơn hàng'); }
      finally { setLoading(false); }
    };
    load();
  }, [tab]);

  const statusColor = { Draft: 'amber', Completed: 'green', Cancelled: 'red' };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Đơn hàng của tôi</h1>

      <div className="flex gap-2 mb-5 overflow-x-auto">
        {[{ v: '', l: 'Tất cả' }, { v: 'Draft', l: 'Đang xử lý' }, { v: 'Completed', l: 'Hoàn tất' }, { v: 'Cancelled', l: 'Đã hủy' }].map(t => (
          <button key={t.v} onClick={() => setTab(t.v)}
            className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap ${tab === t.v ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {loading ? <PageLoader /> : orders.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">📦</p>
          <p>Chưa có đơn hàng</p>
          <Link to="/" className="inline-block mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl text-sm">Mua sắm ngay</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <div key={o._id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs text-gray-400">#{o._id.slice(-10)}</span>
                <div className="flex items-center gap-3">
                  <Badge color={statusColor[o.status]}>{o.status}</Badge>
                  <span className="text-xs text-gray-400">{fmtDate(o.createdAt)}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {o.details?.slice(0, 3).map((d, i) => (
                  <span key={i} className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-lg">
                    {d.variant_id?.product_id?.name || d.variant_id?.sku} × {d.quantity}
                  </span>
                ))}
                {o.details?.length > 3 && <span className="text-xs text-gray-400">+{o.details.length - 3} sản phẩm</span>}
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-600">{fmtVND(o.total_price)}</span>
                <button onClick={() => { setSelected(o); setShowDetail(true); }}
                  className="text-xs text-blue-600 hover:underline">Xem chi tiết →</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <Modal open={showDetail} onClose={() => setShowDetail(false)} title={`Đơn hàng #${selected?._id?.slice(-10)}`} size="lg">
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center">
              <Badge color={statusColor[selected.status]}>{selected.status}</Badge>
              <span className="text-gray-500">{fmtDate(selected.createdAt)}</span>
            </div>
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 text-xs">
                  <tr><th className="px-3 py-2 text-left">Sản phẩm</th><th className="px-3 py-2 text-center">SL</th><th className="px-3 py-2 text-right">T.Tiền</th></tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {selected.details?.map((d, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{d.variant_id?.product_id?.name || d.variant_id?.sku}</td>
                      <td className="px-3 py-2 text-center">{d.quantity}</td>
                      <td className="px-3 py-2 text-right font-semibold">{fmtVND(d.unit_price * d.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
              {selected.discount_amount > 0 && <div className="flex justify-between text-green-600"><span>Giảm giá</span><span>-{fmtVND(selected.discount_amount)}</span></div>}
              <div className="flex justify-between font-bold text-base"><span>Tổng thanh toán</span><span className="text-blue-600">{fmtVND(selected.total_price)}</span></div>
              <div className="flex justify-between text-gray-500 text-xs"><span>Phương thức</span><span>{selected.payments?.[0]?.method || '—'}</span></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
