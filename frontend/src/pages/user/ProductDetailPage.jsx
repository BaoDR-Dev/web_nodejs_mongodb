import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { productAPI, cartAPI, reviewAPI } from '../../api/services';
import { PageLoader, Spinner, fmtVND, Modal, Field, Select } from '../../components/Common/UI';
import { toast } from '../../components/Common/Toast';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

export function ProductDetailPage() {
  const { id }  = useParams();
  const { user, isCustomer } = useAuth();
  const { fetchCount } = useCart();
  const [product, setProduct]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [selectedVariant, setSelected] = useState(null);
  const [qty, setQty]             = useState(1);
  const [adding, setAdding]       = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [reviews, setReviews]     = useState([]);
  const [ratingFilter, setRatingFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      try {
        const [pRes, rRes] = await Promise.all([
          productAPI.getById(id),
          reviewAPI.getByProduct(id, { limit: 10, ...(ratingFilter !== 'all' && { rating: ratingFilter }) })
        ]);
        setProduct(pRes.data.data);
        setSelected(pRes.data.data.variants?.[0]);
        setReviews(rRes.data.data || []);
      } catch { toast.error('Không tải được sản phẩm'); }
      finally { setLoading(false); }
    };
    load();
  }, [id, ratingFilter]);

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

  const openReviewModal = (review = null) => {
    if (review) {
      setEditingReview(review);
      setReviewForm({ rating: review.rating, comment: review.comment || '' });
    } else {
      setEditingReview(null);
      setReviewForm({ rating: 5, comment: '' });
    }
    setShowReviewModal(true);
  };

  const handleReview = async (e) => {
    e.preventDefault();
    try {
      if (editingReview) {
        await reviewAPI.update(editingReview._id, {
          rating: reviewForm.rating,
          comment: reviewForm.comment
        });
        toast.success('Đã cập nhật đánh giá!');
      } else {
        await reviewAPI.create({
          product_id: product._id,
          variant_id: selectedVariant?._id,
          rating: reviewForm.rating,
          comment: reviewForm.comment
        });
        toast.success('Đã gửi đánh giá!');
      }
      setShowReviewModal(false);
      setEditingReview(null);
      setReviewForm({ rating: 5, comment: '' });
      const rRes = await reviewAPI.getByProduct(id, { limit: 10 });
      setReviews(rRes.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi gửi đánh giá');
    }
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
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Đánh giá ({reviews.length})</h2>
          {isCustomer && (
            <button onClick={() => openReviewModal(reviews.find(r => r.user_id?._id === user?._id) || null)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              {reviews.some(r => r.user_id?._id === user?._id) ? 'Chỉnh sửa đánh giá' : 'Viết đánh giá'}
            </button>
          )}
        </div>
        {/* Rating Filter */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {[
            { value: 'all', label: 'Tất cả' },
            { value: '5', label: '5 sao' },
            { value: '4', label: '4 sao' },
            { value: '3', label: '3 sao' },
            { value: '2', label: '2 sao' },
            { value: '1', label: '1 sao' }
          ].map(f => (
            <button key={f.value} onClick={() => setRatingFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${ratingFilter === f.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {f.label}
            </button>
          ))}
        </div>
        {reviews.length > 0 ? (
          <div className="space-y-3">
            {reviews.map(r => (
              <div key={r._id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                      {r.user_id?.username?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{r.user_id?.username}</div>
                      <div className="text-yellow-400">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                    </div>
                  </div>
                  {r.user_id?._id === user?._id && (
                    <button type="button" onClick={() => openReviewModal(r)}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                      Sửa
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-600">{r.comment}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p>Chưa có đánh giá nào</p>
            {isCustomer && <p className="text-sm mt-1">Hãy là người đầu tiên đánh giá sản phẩm này!</p>}
          </div>
        )}
      </div>

      {/* Review Modal */}
      <Modal open={showReviewModal} onClose={() => setShowReviewModal(false)} title={editingReview ? 'Sửa đánh giá sản phẩm' : 'Đánh giá sản phẩm'}>
        <form onSubmit={handleReview} className="space-y-4">
          <p className="text-sm text-gray-600">Sản phẩm: {product?.name}</p>
          <Field label="Đánh giá">
            <Select value={reviewForm.rating} onChange={e => setReviewForm({...reviewForm, rating: Number(e.target.value)})}>
              <option value={5}>⭐⭐⭐⭐⭐ (5 sao)</option>
              <option value={4}>⭐⭐⭐⭐ (4 sao)</option>
              <option value={3}>⭐⭐⭐ (3 sao)</option>
              <option value={2}>⭐⭐ (2 sao)</option>
              <option value={1}>⭐ (1 sao)</option>
            </Select>
          </Field>
          <Field label="Nhận xét">
            <textarea value={reviewForm.comment} onChange={e => setReviewForm({...reviewForm, comment: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" rows={3} placeholder="Nhập nhận xét của bạn..." />
          </Field>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => { setShowReviewModal(false); setEditingReview(null); }} className="px-4 py-2 border rounded-lg text-sm">Hủy</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
              {editingReview ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
