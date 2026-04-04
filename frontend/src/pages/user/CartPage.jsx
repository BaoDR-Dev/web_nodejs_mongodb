import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cartAPI } from '../../api/services';
import { fmtVND, PageLoader } from '../../components/Common/UI';
import { toast } from '../../components/Common/Toast';
import { useCart } from '../../context/CartContext';

export function CartPage() {
  const navigate = useNavigate();
  const { fetchCount } = useCart();

  const [cart, setCart]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState({});

  const fetchCart = useCallback(async () => {
    try {
      const { data } = await cartAPI.get();
      const items = data.data?.items || [];
      setCart(data.data);
      setChecked(prev => {
        const next = { ...prev };
        items.forEach(i => { if (next[i._id] === undefined) next[i._id] = true; });
        return next;
      });
    } catch { toast.error('Lỗi tải giỏ hàng'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const handleUpdate = async (itemId, qty) => {
    try { await cartAPI.update(itemId, { quantity: qty }); fetchCart(); fetchCount(); }
    catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
  };

  const handleRemove = async (itemId) => {
    try {
      await cartAPI.remove(itemId);
      setChecked(prev => { const n = { ...prev }; delete n[itemId]; return n; });
      fetchCart(); fetchCount();
      toast.success('Đã xóa!');
    } catch { toast.error('Lỗi xóa'); }
  };

  const toggleItem = (id) => setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleAll  = () => {
    const items = cart?.items || [];
    const allOn = items.every(i => checked[i._id]);
    const next  = {};
    items.forEach(i => { next[i._id] = !allOn; });
    setChecked(next);
  };

  const handleCheckout = () => {
    const items = cart?.items || [];
    const sel   = items.filter(i => checked[i._id]);
    if (!sel.length) { toast.error('Chọn ít nhất 1 sản phẩm'); return; }
    if (sel.some(i => !i.in_stock)) { toast.error('Có sản phẩm không đủ hàng, vui lòng bỏ chọn'); return; }
    navigate('/checkout', { state: { selectedItems: sel } });
  };

  if (loading) return <PageLoader />;

  const items         = cart?.items || [];
  const allChecked    = items.length > 0 && items.every(i => checked[i._id]);
  const someChecked   = items.some(i => checked[i._id]);
  const selectedItems = items.filter(i => checked[i._id]);
  const selectedTotal = selectedItems.reduce((s, i) => s + i.subtotal, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Giỏ hàng</h1>
        <span className="text-sm text-gray-400">{items.length} sản phẩm</span>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🛒</p>
          <p className="text-gray-500 mb-4">Giỏ hàng trống</p>
          <Link to="/" className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700">Mua sắm ngay</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {/* Select all */}
            <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center gap-3">
              <input type="checkbox" checked={allChecked}
                ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }}
                onChange={toggleAll}
                className="w-4 h-4 accent-blue-600 cursor-pointer" />
              <span className="text-sm font-medium text-gray-600">Chọn tất cả ({items.length})</span>
            </div>

            {items.map(item => (
              <div key={item._id}
                className={`bg-white rounded-2xl border p-4 flex gap-3 transition-all ${checked[item._id] ? 'border-blue-200' : 'border-gray-100 opacity-60'}`}>
                <input type="checkbox" checked={!!checked[item._id]} onChange={() => toggleItem(item._id)}
                  className="w-4 h-4 accent-blue-600 cursor-pointer mt-1 flex-shrink-0" />
                <div className="w-18 h-18 w-16 h-16 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0">
                  {item.image_url
                    ? <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-xl text-gray-200">👕</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{item.variant?.product_id?.name}</p>
                  <p className="text-xs text-gray-400 mb-1">
                    {[item.variant?.color_id?.color_name, item.variant?.size_id?.size_name].filter(Boolean).join(' · ')}
                  </p>
                  {!item.in_stock && <p className="text-xs text-red-500 mb-1">⚠ Không đủ hàng</p>}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                      <button onClick={() => handleUpdate(item._id, Math.max(1, item.quantity - 1))}
                        className="px-2 py-1 hover:bg-gray-50 font-bold text-gray-600 text-sm">−</button>
                      <span className="px-3 py-1 font-mono text-sm">{item.quantity}</span>
                      <button onClick={() => handleUpdate(item._id, item.quantity + 1)}
                        className="px-2 py-1 hover:bg-gray-50 font-bold text-gray-600 text-sm">+</button>
                    </div>
                    <span className="font-bold text-blue-600 text-sm ml-auto">{fmtVND(item.subtotal)}</span>
                    <button onClick={() => handleRemove(item._id)}
                      className="text-gray-300 hover:text-red-400 text-xl leading-none">×</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-20 space-y-4">
              <h2 className="font-bold">Tóm tắt</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Đã chọn</span><span>{selectedItems.length} sản phẩm</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t pt-3">
                  <span>Tạm tính</span>
                  <span className="text-blue-600">{fmtVND(selectedTotal)}</span>
                </div>
              </div>
              <button onClick={handleCheckout} disabled={selectedItems.length === 0}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition">
                Thanh toán ({selectedItems.length})
              </button>
              <Link to="/" className="block text-center text-sm text-gray-400 hover:text-blue-600">
                ← Tiếp tục mua sắm
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}