import React, { useState, useEffect, useCallback } from 'react';
import { reviewAPI } from '../../../api/services';
import { Table, Badge, Modal, Confirm, SearchBar, Pagination, fmtDate } from '../../../components/Common/UI';
import { toast } from '../../../components/Common/Toast';

const STAR = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

export default function AdminReviews() {
  const [reviews, setReviews]   = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [selected, setSelected]         = useState(null);
  const [showDetail, setShowDetail]     = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting]         = useState(false);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await reviewAPI.getAll({
        page, limit: 20,
        is_active: filterStatus === '' ? undefined : filterStatus === 'active',
      });
      setReviews(data.data || []);
      setTotal(data.total || 0);
    } catch { toast.error('Không tải được đánh giá'); }
    finally { setLoading(false); }
  }, [page, filterStatus]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleToggle = async (r) => {
    try {
      await reviewAPI.toggle(r._id);
      toast.success(r.is_visible !== false ? 'Đã ẩn đánh giá' : 'Đã hiện đánh giá');
      fetchReviews();
    } catch { toast.error('Lỗi cập nhật'); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await reviewAPI.delete(selected._id);
      toast.success('Đã xóa đánh giá');
      setShowDeleteConfirm(false);
      fetchReviews();
    } catch (err) { toast.error(err.response?.data?.message || 'Không thể xóa'); }
    finally { setDeleting(false); }
  };

  const filtered = search
    ? reviews.filter(r =>
        r.customer_id?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.variant_id?.product_id?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : reviews;

  const starColor = (n) => n >= 4 ? 'text-yellow-400' : n === 3 ? 'text-amber-400' : 'text-red-400';

  const columns = [
    { header: 'Sản phẩm', render: r => (
      <div className="max-w-[180px]">
        <p className="font-semibold text-sm truncate">{r.product_id?.name || '—'}</p>
        <p className="text-xs text-gray-400 font-mono">{r.product_id?.sku || ''}</p>
      </div>
    )},
    { header: 'Khách hàng', render: r => (
      <span className="text-sm">{r.user_id?.username || '—'}</span>
    )},
    { header: 'Sao', render: r => (
      <span className={`text-sm font-bold ${starColor(r.rating)}`}>{STAR(r.rating)}</span>
    )},
    { header: 'Nội dung', render: r => (
      <p className="text-xs text-gray-600 max-w-[200px] truncate">{r.comment || '—'}</p>
    )},
    { header: 'Trạng thái', render: r => (
      <Badge color={r.is_visible !== false ? 'green' : 'red'}>
        {r.is_visible !== false ? 'Hiển thị' : 'Đã ẩn'}
      </Badge>
    )},
    { header: 'Ngày', render: r => <span className="text-xs text-gray-400">{fmtDate(r.createdAt)}</span> },
    { header: 'Thao tác', render: r => (
      <div className="flex gap-2">
        <button onClick={() => { setSelected(r); setShowDetail(true); }}
          className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">Chi tiết</button>
        <button onClick={() => handleToggle(r)}
          className={`text-xs px-2 py-1 rounded ${r.is_visible !== false
            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
          {r.is_visible !== false ? 'Ẩn' : 'Hiện'}
        </button>
        <button onClick={() => { setSelected(r); setShowDeleteConfirm(true); }}
          className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100">Xóa</button>
      </div>
    )},
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Đánh giá sản phẩm</h2>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4 flex flex-wrap gap-3">
        <SearchBar value={search} onChange={setSearch} onSearch={() => {}} placeholder="Tìm tên khách, tên sản phẩm..." />
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">Tất cả</option>
          <option value="active">Đang hiển thị</option>
          <option value="hidden">Đã ẩn</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <Table columns={columns} data={filtered} loading={loading} emptyText="Chưa có đánh giá nào" />
        <div className="px-4 pb-4">
          <Pagination page={page} total={total} onChange={setPage} />
        </div>
      </div>

      {/* Detail Modal */}
      <Modal open={showDetail} onClose={() => setShowDetail(false)} title="Chi tiết đánh giá" size="sm">
        {selected && (
          <div className="space-y-3 text-sm">
            <div className="bg-gray-50 rounded-xl p-3 space-y-1">
              <p><span className="text-gray-500">Sản phẩm:</span> <b>{selected.product_id?.name || '—'}</b></p>
              <p><span className="text-gray-500">SKU:</span> <span className="font-mono text-xs">{selected.product_id?.sku || '—'}</span></p>
              <p><span className="text-gray-500">Khách hàng:</span> <b>{selected.user_id?.username || '—'}</b></p>
              <p><span className="text-gray-500">Ngày đánh giá:</span> {fmtDate(selected.createdAt)}</p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-3">
              <p className={`text-lg font-bold ${starColor(selected.rating)}`}>{STAR(selected.rating)} <span className="text-gray-600 text-sm font-normal">({selected.rating}/5)</span></p>
            </div>
            {selected.comment && (
              <div className="bg-white border border-gray-200 rounded-xl p-3">
                <p className="text-gray-700 leading-relaxed">{selected.comment}</p>
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button onClick={() => { handleToggle(selected); setShowDetail(false); }}
                className={`px-4 py-2 rounded-lg text-sm ${selected.is_visible !== false
                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                {selected.is_visible !== false ? 'Ẩn đánh giá' : 'Hiện đánh giá'}
              </button>
              <button onClick={() => { setShowDetail(false); setShowDeleteConfirm(true); }}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100">
                Xóa
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Confirm open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={handleDelete}
        loading={deleting} title="Xóa đánh giá"
        message="Bạn có chắc muốn xóa đánh giá này? Hành động không thể hoàn tác." />
    </div>
  );
}
