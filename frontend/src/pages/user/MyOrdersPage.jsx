import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { orderAPI, reviewAPI } from '../../api/services';
import { Modal, Badge, fmtVND, fmtDate, PageLoader, Field, Select } from '../../components/Common/UI';
import { toast } from '../../components/Common/Toast';

// ─── Hiển thị sao ────────────────────────────────────────────────────────────
function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="text-2xl focus:outline-none transition-transform hover:scale-110"
        >
          <span className={(hovered || value) >= star ? 'text-yellow-400' : 'text-gray-300'}>★</span>
        </button>
      ))}
      <span className="ml-2 text-sm text-gray-500 self-center">{value} sao</span>
    </div>
  );
}

export function MyOrdersPage() {
  const [orders, setOrders]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  // ── Review states ──────────────────────────────────────────────────────────
  const [showReview, setShowReview]       = useState(false);
  const [reviewProduct, setReviewProduct] = useState(null); // { detail, existingReview }
  const [reviewForm, setReviewForm]       = useState({ rating: 5, comment: '' });
  const [reviewLoading, setReviewLoading] = useState(false);
  // Map: variant_id (string) → review object (có _id nếu đã review)
  const [orderReviews, setOrderReviews]   = useState({});

  // ── Cancel states ──────────────────────────────────────────────────────────
  const [cancelLoading, setCancelLoading] = useState(false);

  const [tab, setTab] = useState('');

  // ── Fetch orders ──────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async (filterTab) => {
    setLoading(true);
    try {
      const { data } = await orderAPI.myOrders({ status: filterTab || undefined, limit: 50 });
      setOrders(data.data || []);
    } catch { toast.error('Lỗi tải đơn hàng'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchOrders(tab); }, [tab, fetchOrders]);

  // ── Fetch reviews của đơn hàng đang xem ──────────────────────────────────
  const fetchOrderReviews = async (orderId) => {
    try {
      const { data } = await reviewAPI.getByOrder(orderId);
      const map = {};
      (data.data || []).forEach(r => {
        // key theo variant_id
        const key = r.variant_id?.toString?.() || r.variant_id;
        map[key] = r;
      });
      setOrderReviews(map);
    } catch {
      setOrderReviews({});
    }
  };

  // ── Mở chi tiết đơn ──────────────────────────────────────────────────────
  const openDetail = async (order) => {
    setSelected(order);
    setShowDetail(true);
    setOrderReviews({});
    if (order.status === 'Completed') {
      await fetchOrderReviews(order._id);
    }
  };

  // ── Mở form đánh giá (mới hoặc sửa) ──────────────────────────────────────
  const openReviewModal = (detail) => {
    const variantKey = detail.variant_id?._id || detail.variant_id;
    const existing = orderReviews[variantKey];
    setReviewProduct({ detail, existingReview: existing || null });
    setReviewForm({
      rating:  existing?.rating  || 5,
      comment: existing?.comment || ''
    });
    setShowReview(true);
  };

  // ── Gửi / Cập nhật đánh giá ───────────────────────────────────────────────
  const handleReview = async (e) => {
    e.preventDefault();
    setReviewLoading(true);
    const { detail, existingReview } = reviewProduct;
    const variantId  = detail.variant_id?._id || detail.variant_id;
    const productId  = detail.variant_id?.product_id?._id || detail.variant_id?.product_id;

    try {
      let savedReview;
      if (existingReview) {
        // Sửa đánh giá cũ
        const { data } = await reviewAPI.update(existingReview._id, {
          rating:  reviewForm.rating,
          comment: reviewForm.comment
        });
        savedReview = data.data;
        toast.success('Đã cập nhật đánh giá!');
      } else {
        // Tạo đánh giá mới
        const { data } = await reviewAPI.create({
          product_id: productId,
          variant_id: variantId,
          order_id:   selected._id,
          rating:     reviewForm.rating,
          comment:    reviewForm.comment
        });
        savedReview = data.data;
        toast.success('Đã gửi đánh giá!');
      }

      // Cập nhật map review local
      setOrderReviews(prev => ({ ...prev, [variantId]: savedReview }));
      setShowReview(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi gửi đánh giá');
    } finally {
      setReviewLoading(false);
    }
  };

  // ── Hủy đơn (chỉ cho phép khi Draft và chưa có vận chuyển) ────────────────
  const handleCancel = async () => {
    if (selected?.status !== 'Draft') {
      toast.error('Chỉ có thể hủy đơn hàng đang chờ xử lý.');
      return;
    }
    if (!window.confirm('Bạn có chắc muốn hủy đơn hàng này?')) return;
    setCancelLoading(true);
    try {
      await orderAPI.cancel(selected._id);
      toast.success('Đã hủy đơn hàng!');
      setShowDetail(false);
      fetchOrders(tab);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi hủy đơn hàng');
    } finally {
      setCancelLoading(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const statusColor = { Draft: 'amber', Completed: 'green', Cancelled: 'red', Returned: 'orange' };
  const statusLabel = { Draft: 'Đang xử lý', Completed: 'Hoàn thành', Cancelled: 'Đã hủy', Returned: 'Đã trả' };

  const tabs = [
    { v: '',           l: 'Tất cả' },
    { v: 'Draft',      l: 'Đang xử lý' },
    { v: 'Completed',  l: 'Hoàn tất' },
    { v: 'Cancelled',  l: 'Đã hủy' },
    { v: 'Returned',   l: 'Đã trả' },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Đơn hàng của tôi</h1>

      {/* Tab filter */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button
            key={t.v}
            onClick={() => setTab(t.v)}
            className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-colors ${
              tab === t.v ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t.l}
          </button>
        ))}
      </div>

      {/* Danh sách đơn */}
      {loading ? <PageLoader /> : orders.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">📦</p>
          <p>Chưa có đơn hàng</p>
          <Link to="/" className="inline-block mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl text-sm">
            Mua sắm ngay
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <div key={o._id} className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs text-gray-400">#{o._id.slice(-10)}</span>
                <div className="flex items-center gap-3">
                  <Badge color={statusColor[o.status]}>{statusLabel[o.status] || o.status}</Badge>
                  <span className="text-xs text-gray-400">{fmtDate(o.createdAt)}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {o.details?.slice(0, 3).map((d, i) => (
                  <span key={i} className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-lg">
                    {d.variant_id?.product_id?.name || d.variant_id?.sku} × {d.quantity}
                  </span>
                ))}
                {o.details?.length > 3 && (
                  <span className="text-xs text-gray-400">+{o.details.length - 3} sản phẩm</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-600">{fmtVND(o.total_price)}</span>
                <button
                  onClick={() => openDetail(o)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Xem chi tiết →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal chi tiết đơn hàng ─────────────────────────────────────── */}
      <Modal open={showDetail} onClose={() => setShowDetail(false)} title={`Đơn hàng #${selected?._id?.slice(-10)}`} size="lg">
        {selected && (
          <div className="space-y-4 text-sm">
            {/* Header */}
            <div className="flex justify-between items-center">
              <Badge color={statusColor[selected.status]}>{statusLabel[selected.status] || selected.status}</Badge>
              <span className="text-gray-500">{fmtDate(selected.createdAt)}</span>
            </div>

            {/* Bảng sản phẩm */}
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left">Sản phẩm</th>
                    <th className="px-3 py-2 text-center">SL</th>
                    <th className="px-3 py-2 text-right">T.Tiền</th>
                    {selected.status === 'Completed' && (
                      <th className="px-3 py-2 text-center">Đánh giá</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {selected.details?.map((d, i) => {
                    const variantKey = d.variant_id?._id || d.variant_id;
                    const existingReview = orderReviews[variantKey];
                    return (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <div>{d.variant_id?.product_id?.name || d.variant_id?.sku}</div>
                          {(d.variant_id?.color_id?.color_name || d.variant_id?.size_id?.size_name) && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              {[d.variant_id?.color_id?.color_name, d.variant_id?.size_id?.size_name].filter(Boolean).join(' / ')}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">{d.quantity}</td>
                        <td className="px-3 py-2 text-right font-semibold">{fmtVND(d.unit_price * d.quantity)}</td>
                        {selected.status === 'Completed' && (
                          <td className="px-3 py-2 text-center">
                            {existingReview ? (
                              <div className="flex flex-col items-center gap-1">
                                <div className="text-yellow-400 text-xs">
                                  {'★'.repeat(existingReview.rating)}{'☆'.repeat(5 - existingReview.rating)}
                                </div>
                                <button
                                  onClick={() => openReviewModal(d)}
                                  className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                                >
                                  ✏️ Sửa
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => openReviewModal(d)}
                                className="text-xs px-2 py-1 bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100 transition-colors"
                              >
                                ⭐ Đánh giá
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Tổng thanh toán */}
            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
              {selected.discount_amount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Giảm giá</span>
                  <span>-{fmtVND(selected.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base">
                <span>Tổng thanh toán</span>
                <span className="text-blue-600">{fmtVND(selected.total_price)}</span>
              </div>
              <div className="flex justify-between text-gray-500 text-xs">
                <span>Phương thức</span>
                <span>{selected.payments?.[0]?.method || '—'}</span>
              </div>
              {selected.shipping_address && (
                <div className="flex justify-between text-gray-500 text-xs">
                  <span>Địa chỉ</span>
                  <span className="text-right max-w-xs">{selected.shipping_address}</span>
                </div>
              )}
            </div>

            {/* Hành động:
                - Draft (đang xử lý): cho phép hủy đơn
                - Completed: KHÔNG có nút hủy/trả, chỉ đánh giá từng sản phẩm trong bảng
                - Cancelled/Returned: không có nút gì
            */}
            {selected.status === 'Draft' && (
              <div className="flex justify-end">
                <button
                  onClick={handleCancel}
                  disabled={cancelLoading}
                  className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  {cancelLoading ? 'Đang hủy...' : '🚫 Hủy đơn hàng'}
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Modal đánh giá ──────────────────────────────────────────────── */}
      <Modal
        open={showReview}
        onClose={() => !reviewLoading && setShowReview(false)}
        title={reviewProduct?.existingReview ? 'Sửa đánh giá' : 'Đánh giá sản phẩm'}
      >
        {reviewProduct && (
          <form onSubmit={handleReview} className="space-y-4">
            {/* Tên sản phẩm */}
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-0.5">Sản phẩm</p>
              <p className="font-medium text-sm">
                {reviewProduct.detail?.variant_id?.product_id?.name || reviewProduct.detail?.variant_id?.sku}
              </p>
              {(reviewProduct.detail?.variant_id?.color_id?.color_name || reviewProduct.detail?.variant_id?.size_id?.size_name) && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {[reviewProduct.detail?.variant_id?.color_id?.color_name, reviewProduct.detail?.variant_id?.size_id?.size_name].filter(Boolean).join(' / ')}
                </p>
              )}
            </div>

            {/* Chọn sao */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Đánh giá của bạn</label>
              <StarRating
                value={reviewForm.rating}
                onChange={v => setReviewForm(f => ({ ...f, rating: v }))}
              />
            </div>

            {/* Nhận xét */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nhận xét</label>
              <textarea
                value={reviewForm.comment}
                onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
                rows={4}
                placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowReview(false)}
                disabled={reviewLoading}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={reviewLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {reviewLoading
                  ? 'Đang gửi...'
                  : reviewProduct.existingReview ? '💾 Lưu chỉnh sửa' : '⭐ Gửi đánh giá'
                }
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
