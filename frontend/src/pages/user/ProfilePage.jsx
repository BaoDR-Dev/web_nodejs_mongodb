import React, { useState, useEffect } from 'react';
import { authAPI, customerAPI } from '../../api/services';
import { toast } from '../../components/Common/Toast';
import { PageLoader } from '../../components/Common/UI';


export function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);

  useEffect(() => {
    const loadData = async () => {
    try {
        // 1. Dùng authAPI.getMe() - Không cần qua userRoutes/searchUsers nên không bị chặn
        const { data } = await authAPI.getMe();
        const user = data.data; // Dựa vào cấu trúc res.json({ success: true, data: user })
        
        if (user.customer_id) {
            const cRes = await customerAPI.getById(user.customer_id);
            setForm(cRes.data.data);
        } else {
            toast.error("Tài khoản của bạn không có hồ sơ khách hàng.");
        }
    } catch (err) {
        toast.error('Lỗi tải thông tin');
    } finally {
        setLoading(false);
    }
};
    loadData();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!form?._id) return toast.error('Không thể cập nhật hồ sơ không tồn tại');

    try {
      await customerAPI.update(form._id, form);
      toast.success('Đã lưu thay đổi!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cập nhật thất bại');
    }
  };

  if (loading) return <PageLoader />;
  if (form?.isStaff) return <div className="text-center py-20">Admin/Staff không chỉnh sửa hồ sơ khách hàng tại đây.</div>;
  if (!form) return <div className="text-center py-20">Không tìm thấy thông tin tài khoản</div>;
  return (
    <div className="max-w-2xl mx-auto py-12 px-6">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-black uppercase tracking-tighter">Hồ sơ cá nhân</h1>
      </div>

      <form onSubmit={handleUpdate} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Họ và tên</label>
            <input 
              className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 outline-none transition" 
              value={form.full_name || ''} 
              onChange={e => setForm({...form, full_name: e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Số điện thoại</label>
            <input 
              className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 outline-none transition" 
              value={form.phone || ''} 
              onChange={e => setForm({...form, phone: e.target.value})} 
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Địa chỉ giao hàng</label>
          <textarea 
            className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 outline-none transition" 
            rows="3" 
            value={form.address || ''} 
            onChange={e => setForm({...form, address: e.target.value})} 
          />
        </div>

        <button 
          type="submit" 
          className="w-full bg-black text-white py-4 rounded-2xl font-bold hover:bg-blue-600 transition-all active:scale-[0.98]"
        >
          Lưu thay đổi
        </button>
      </form>
    </div>
  );
}