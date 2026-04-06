import React from 'react';

// ── Spinner ───────────────────────────────────────────────────────────────────
export const Spinner = ({ size = 'md' }) => {
  const s = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }[size];
  return (
    <div className={`${s} border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin`} />
  );
};

export const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[300px]">
    <Spinner size="lg" />
  </div>
);

// ── Badge ─────────────────────────────────────────────────────────────────────
export const Badge = ({ children, color = 'gray' }) => {
  const c = {
    gray:   'bg-gray-100 text-gray-700',
    green:  'bg-emerald-100 text-emerald-700',
    red:    'bg-red-100 text-red-700',
    blue:   'bg-blue-100 text-blue-700',
    amber:  'bg-amber-100 text-amber-700',
    purple: 'bg-purple-100 text-purple-700',
  }[color];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c}`}>{children}</span>;
};

export const statusColor = (s) => {
  const m = {
    Draft: 'amber', Completed: 'green', Cancelled: 'red',
    Active: 'green', Banned: 'red', Pending: 'amber',
    Approved: 'blue', Rejected: 'red',
    Delivered: 'green', 'In Transit': 'blue', Failed: 'red',
  };
  return m[s] || 'gray';
};

// ── Modal ─────────────────────────────────────────────────────────────────────
export const Modal = ({ open, onClose, title, children, size = 'md' }) => {
  if (!open) return null;
  const w = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${w} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};

// ── Confirm Dialog ────────────────────────────────────────────────────────────
export const Confirm = ({ open, onClose, onConfirm, title, message, loading, confirmText }) => (
  <Modal open={open} onClose={onClose} title={title || 'Xác nhận'} size="sm">
    <p className="text-gray-600 mb-5">{message}</p>
    <div className="flex justify-end gap-3">
      <button onClick={onClose} className="btn-secondary">Hủy</button>
      <button onClick={onConfirm} disabled={loading} className="btn-danger">
        {loading ? <Spinner size="sm" /> : (confirmText || 'Xác nhận xóa')}
      </button>
    </div>
  </Modal>
);

// ── Table ─────────────────────────────────────────────────────────────────────
export const Table = ({ columns, data, loading, emptyText = 'Không có dữ liệu' }) => (
  <div className="overflow-x-auto rounded-xl border border-gray-100">
    <table className="w-full text-sm">
      <thead className="bg-gray-50 border-b border-gray-100">
        <tr>
          {columns.map((c, i) => (
            <th key={i} className={`px-4 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wider ${c.className || ''}`}>
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50 bg-white">
        {loading ? (
          <tr><td colSpan={columns.length} className="text-center py-12"><Spinner /></td></tr>
        ) : data.length === 0 ? (
          <tr><td colSpan={columns.length} className="text-center py-12 text-gray-400">{emptyText}</td></tr>
        ) : data.map((row, i) => (
          <tr key={row._id || i} className="hover:bg-gray-50 transition-colors">
            {columns.map((c, j) => (
              <td key={j} className={`px-4 py-3 text-gray-700 ${c.cellClass || ''}`}>
                {c.render ? c.render(row) : row[c.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ── Pagination ────────────────────────────────────────────────────────────────
export const Pagination = ({ page, total, limit = 20, onChange }) => {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
      <span>Tổng {total} mục</span>
      <div className="flex gap-1">
        <button disabled={page === 1} onClick={() => onChange(page - 1)} className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-50">‹</button>
        {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map(p => (
          <button key={p} onClick={() => onChange(p)} className={`px-3 py-1 rounded border ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'}`}>{p}</button>
        ))}
        <button disabled={page === pages} onClick={() => onChange(page + 1)} className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-50">›</button>
      </div>
    </div>
  );
};

// ── Form Field ────────────────────────────────────────────────────────────────
export const Field = ({ label, required, error, children }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>}
    {children}
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

export const Input = (props) => (
  <input {...props} className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 ${props.className || ''}`} />
);

export const Select = ({ children, ...props }) => (
  <select {...props} className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${props.className || ''}`}>
    {children}
  </select>
);

export const Textarea = (props) => (
  <textarea {...props} rows={props.rows || 3} className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${props.className || ''}`} />
);

// ── Search Bar ────────────────────────────────────────────────────────────────
export const SearchBar = ({ value, onChange, placeholder = 'Tìm kiếm...', onSearch }) => (
  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => e.key === 'Enter' && onSearch?.()}
      placeholder={placeholder}
      className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  </div>
);

// ── Empty State ───────────────────────────────────────────────────────────────
export const Empty = ({ icon = '📭', title = 'Không có dữ liệu', desc }) => (
  <div className="text-center py-16">
    <div className="text-5xl mb-3">{icon}</div>
    <p className="font-medium text-gray-600">{title}</p>
    {desc && <p className="text-sm text-gray-400 mt-1">{desc}</p>}
  </div>
);

// ── Stat Card ─────────────────────────────────────────────────────────────────
export const StatCard = ({ icon, label, value, color = 'blue', sub }) => {
  const c = {
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-emerald-50 text-emerald-600',
    amber:  'bg-amber-50 text-amber-600',
    red:    'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  }[color];
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${c}`}>{icon}</div>
      </div>
    </div>
  );
};

// ── Format helpers ────────────────────────────────────────────────────────────
export const fmtVND  = (n) => (n || 0).toLocaleString('vi-VN') + '₫';
export const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
export const fmtDateTime = (d) => d ? new Date(d).toLocaleString('vi-VN') : '—';
