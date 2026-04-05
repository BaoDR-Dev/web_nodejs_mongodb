import React, { useState } from 'react';
import { userAPI } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../components/Common/Toast';
import { Lock } from 'lucide-react'; // Đảm bảo bạn đã npm install lucide-react

export function ChangePasswordPage() {
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePassword = async (e) => {
    e.preventDefault();
    if (!user || !user.id) {
        toast.error('Bạn chưa đăng nhập!');
        return;
    }
    if (password.length < 6) return toast.error('Mật khẩu tối thiểu 6 ký tự');
    
    setLoading(true);
    try {
      await userAPI.changePassword(user.id, { newPassword: password });
      toast.success('Đổi mật khẩu thành công!');
      setPassword('');
    } catch (err) { 
        console.error(err);
        toast.error(err.response?.data?.message || 'Lỗi đổi mật khẩu'); 
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="text-blue-600" size={32} />
        </div>
        <h1 className="text-2xl font-black uppercase tracking-tighter">Đổi mật khẩu</h1>
        <p className="text-gray-500 text-sm mt-2">Đảm bảo mật khẩu của bạn đủ mạnh và bảo mật.</p>
      </div>

      <form onSubmit={handlePassword} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-5">
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Mật khẩu mới</label>
          <input 
            type="password" 
            className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 outline-none transition"
            placeholder="••••••••" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
          />
        </div>
        
        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-black text-white py-4 rounded-2xl font-bold hover:bg-blue-600 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? 'Đang xử lý...' : 'Xác nhận thay đổi'}
        </button>
      </form>
    </div>
  );
}