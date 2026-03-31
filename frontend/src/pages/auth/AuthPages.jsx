import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI, customerAuthAPI } from '../../api/services';
import { toast } from '../../components/Common/Toast';
import { Spinner } from '../../components/Common/UI';

// ─── Shared layout wrapper ────────────────────────────────────────────────────
function AuthLayout({ children, title, subtitle, emoji = '👗' }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Background circles */}
        <div className="absolute w-96 h-96 rounded-full bg-blue-600/10 -top-20 -left-20" />
        <div className="absolute w-64 h-64 rounded-full bg-indigo-500/10 bottom-10 right-0" />
        <div className="absolute w-48 h-48 rounded-full bg-blue-400/5 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

        <div className="relative z-10 text-center">
          <span className="text-7xl block mb-6">👗</span>
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">Fashion Store</h1>
          <p className="text-blue-300 text-lg mb-8">Thời trang phong cách – Chất lượng đích thực</p>
          <div className="flex gap-3 justify-center">
            {['🚚 Giao nhanh 2h', '♻️ Đổi trả 30 ngày', '💎 Hàng chính hãng'].map(t => (
              <span key={t} className="bg-white/10 text-white/80 text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <span className="text-5xl">{emoji}</span>
            <p className="font-bold text-xl text-gray-900 mt-2">Fashion Store</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
              {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function Steps({ current, total, labels }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }, (_, i) => i + 1).map((s, i) => (
        <React.Fragment key={s}>
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              s < current ? 'bg-blue-600 text-white' :
              s === current ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
              'bg-gray-100 text-gray-400'
            }`}>
              {s < current ? '✓' : s}
            </div>
            {labels && <span className={`text-xs hidden sm:block ${s === current ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>{labels[i]}</span>}
          </div>
          {i < total - 1 && <div className={`flex-1 h-0.5 rounded ${s < current ? 'bg-blue-600' : 'bg-gray-100'}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Input component ──────────────────────────────────────────────────────────
function AuthInput({ label, required, icon, ...props }) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}{required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{icon}</span>}
        <input
          {...props}
          className={`w-full border border-gray-200 rounded-xl text-sm py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
            icon ? 'pl-9 pr-4' : 'px-4'
          } ${props.className || ''}`}
        />
      </div>
    </div>
  );
}

// ─── Submit button ────────────────────────────────────────────────────────────
function SubmitBtn({ loading, children }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
    >
      {loading ? <Spinner size="sm" /> : children}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || null;

  const [form, setForm] = useState({ username: '', password: '' });
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const user = await login(form);
      toast.success(`Chào mừng trở lại, ${user.username}!`);
      if (from) return navigate(from, { replace: true });
      navigate(user.role === 'Customer' ? '/' : '/admin');
    } catch (err) {
      const data = err.response?.data;
      if (data?.step === 'verify_otp') {
        toast.info('Tài khoản chưa xác minh. Vui lòng nhập OTP.');
        navigate('/verify-otp', { state: { email: data.email } });
        return;
      }
      toast.error(data?.message || 'Đăng nhập thất bại');
    }
  };

  return (
    <AuthLayout title="Đăng nhập" subtitle="Chào mừng bạn quay trở lại!">
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          label="Tên đăng nhập"
          required
          icon="👤"
          placeholder="Nhập username"
          value={form.username}
          onChange={e => setForm({ ...form, username: e.target.value })}
          autoComplete="username"
        />

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-gray-700">
              Mật khẩu<span className="text-red-400 ml-1">*</span>
            </label>
            <Link to="/forgot-password" className="text-xs text-blue-600 hover:underline">Quên mật khẩu?</Link>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔒</span>
            <input
              type={showPass ? 'text' : 'password'}
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="Nhập mật khẩu"
              required
              autoComplete="current-password"
              className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
            <button
              type="button"
              onClick={() => setShowPass(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
            >
              {showPass ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <SubmitBtn loading={loading}>Đăng nhập</SubmitBtn>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Chưa có tài khoản?{' '}
        <Link to="/register" className="text-blue-600 font-semibold hover:underline">Đăng ký ngay</Link>
      </p>
    </AuthLayout>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTER PAGE  (2 bước: form info → xác minh OTP)
// ═══════════════════════════════════════════════════════════════════════════════
export function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep]     = useState(1);
  const [loading, setLoading] = useState(false);
  const [email, setEmail]   = useState('');
  const [otp, setOtp]       = useState('');
  const [showPass, setShowPass] = useState(false);

  const [form, setForm] = useState({
    full_name: '', username: '', email: '', password: '',
    phone: '', address: '',
  });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  // Bước 1 — Gửi form đăng ký
  const handleRegister = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    setLoading(true);
    try {
      await customerAuthAPI.register(form);
      setEmail(form.email);
      setStep(2);
      toast.success('Mã OTP đã gửi về email!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  // Bước 2 — Xác minh OTP
  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await customerAuthAPI.verifyOtp({ email, otp });
      toast.success('Xác minh thành công! Hãy đăng nhập.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Mã OTP không đúng');
    } finally {
      setLoading(false);
    }
  };

  // Gửi lại OTP
  const handleResend = async () => {
    try {
      await customerAuthAPI.resendOtp({ email });
      toast.success('Đã gửi lại OTP!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gửi lại thất bại');
    }
  };

  return (
    <AuthLayout
      title={step === 1 ? 'Tạo tài khoản' : 'Xác minh email'}
      subtitle={step === 1 ? 'Điền thông tin để bắt đầu mua sắm' : `Nhập mã OTP đã gửi về ${email}`}
    >
      <Steps current={step} total={2} labels={['Thông tin', 'Xác minh']} />

      {step === 1 ? (
        <form onSubmit={handleRegister} className="space-y-4">
          {/* Họ tên & Username */}
          <div className="grid grid-cols-2 gap-3">
            <AuthInput label="Họ tên" required icon="👤" placeholder="Nguyễn Văn A"
              value={form.full_name} onChange={set('full_name')} />
            <AuthInput label="Username" required icon="@" placeholder="username"
              value={form.username} onChange={set('username')} autoComplete="username" />
          </div>

          {/* Email */}
          <AuthInput label="Email" required type="email" icon="✉️" placeholder="email@example.com"
            value={form.email} onChange={set('email')} autoComplete="email" />

          {/* Mật khẩu */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Mật khẩu<span className="text-red-400 ml-1">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔒</span>
              <input
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                required
                minLength={6}
                placeholder="Ít nhất 6 ký tự"
                autoComplete="new-password"
                className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* SĐT & Địa chỉ */}
          <div className="grid grid-cols-2 gap-3">
            <AuthInput label="Số điện thoại" icon="📞" placeholder="0901..."
              value={form.phone} onChange={set('phone')} type="tel" />
            <AuthInput label="Địa chỉ" icon="📍" placeholder="Quận, Thành phố"
              value={form.address} onChange={set('address')} />
          </div>

          <SubmitBtn loading={loading}>Đăng ký →</SubmitBtn>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="space-y-5">
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-sm text-blue-700">
              Mã OTP đã gửi về <b>{email}</b>.<br />
              <span className="text-blue-500 text-xs">Mã có hiệu lực trong 5 phút.</span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Nhập mã 6 số</label>
            <input
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              required
              placeholder="000000"
              className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-center text-3xl font-mono font-bold tracking-[0.6em] focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <SubmitBtn loading={loading}>Xác minh</SubmitBtn>

          <button
            type="button"
            onClick={handleResend}
            className="w-full text-sm text-gray-400 hover:text-blue-600 transition py-1"
          >
            Chưa nhận được mã? <span className="underline">Gửi lại</span>
          </button>

          <button
            type="button"
            onClick={() => setStep(1)}
            className="w-full text-sm text-gray-400 hover:text-gray-600 transition"
          >
            ← Quay lại nhập thông tin
          </button>
        </form>
      )}

      <p className="text-center text-sm text-gray-500 mt-6">
        Đã có tài khoản?{' '}
        <Link to="/login" className="text-blue-600 font-semibold hover:underline">Đăng nhập</Link>
      </p>
    </AuthLayout>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFY OTP PAGE  (redirect từ login khi chưa verify)
// ═══════════════════════════════════════════════════════════════════════════════
export function VerifyOtpPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const emailInit = location.state?.email || '';

  const [email, setEmail]   = useState(emailInit);
  const [otp, setOtp]       = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await customerAuthAPI.verifyOtp({ email, otp });
      toast.success('Xác minh thành công! Hãy đăng nhập.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Mã OTP không đúng');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) { toast.error('Vui lòng nhập email'); return; }
    try {
      await customerAuthAPI.resendOtp({ email });
      toast.success('Đã gửi lại OTP!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gửi lại thất bại');
    }
  };

  return (
    <AuthLayout title="Xác minh tài khoản" subtitle="Nhập mã OTP đã gửi về email của bạn" emoji="✉️">
      <form onSubmit={handleVerify} className="space-y-5">
        {!emailInit && (
          <AuthInput label="Email" required type="email" icon="✉️" placeholder="email@example.com"
            value={email} onChange={e => setEmail(e.target.value)} />
        )}
        {emailInit && (
          <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700 text-center">
            Gửi OTP về <b>{email}</b>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Mã OTP 6 số</label>
          <input
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            required
            placeholder="000000"
            className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-center text-3xl font-mono font-bold tracking-[0.6em] focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <SubmitBtn loading={loading}>Xác minh</SubmitBtn>

        <button type="button" onClick={handleResend}
          className="w-full text-sm text-gray-400 hover:text-blue-600 transition py-1">
          Chưa nhận được mã? <span className="underline">Gửi lại</span>
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        <Link to="/login" className="text-gray-400 hover:text-blue-600">← Quay lại đăng nhập</Link>
      </p>
    </AuthLayout>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORGOT PASSWORD PAGE  (3 bước: email → OTP → mật khẩu mới)
// ═══════════════════════════════════════════════════════════════════════════════
export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep]         = useState(1);
  const [loading, setLoading]   = useState(false);
  const [email, setEmail]       = useState('');
  const [otp, setOtp]           = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPass, setNewPass]   = useState('');
  const [showPass, setShowPass] = useState(false);

  // Bước 1 — Gửi email
  const step1 = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      setStep(2);
      toast.success('OTP đã gửi về email!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi gửi OTP');
    } finally {
      setLoading(false);
    }
  };

  // Bước 2 — Xác minh OTP
  const step2 = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authAPI.verifyResetOtp({ email, otp });
      setResetToken(data.reset_token);
      setStep(3);
      toast.success('OTP hợp lệ!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'OTP không đúng');
    } finally {
      setLoading(false);
    }
  };

  // Bước 3 — Đặt mật khẩu mới
  const step3 = async (e) => {
    e.preventDefault();
    if (newPass.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    setLoading(true);
    try {
      await authAPI.resetPassword({ token: resetToken, new_password: newPass });
      toast.success('Đổi mật khẩu thành công!');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi đặt lại mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ['Nhập email', 'Nhập OTP', 'Mật khẩu mới'];

  return (
    <AuthLayout title={stepLabels[step - 1]} subtitle="Lấy lại quyền truy cập tài khoản của bạn" emoji="🔑">
      <Steps current={step} total={3} labels={stepLabels} />

      {step === 1 && (
        <form onSubmit={step1} className="space-y-4">
          <AuthInput
            label="Email đăng ký"
            required
            type="email"
            icon="✉️"
            placeholder="email@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
          />
          <SubmitBtn loading={loading}>Gửi mã OTP</SubmitBtn>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={step2} className="space-y-5">
          <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700 text-center">
            Gửi OTP về <b>{email}</b>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Mã OTP 6 số</label>
            <input
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              required
              placeholder="000000"
              className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-center text-3xl font-mono font-bold tracking-[0.6em] focus:outline-none focus:border-blue-500 transition"
            />
          </div>
          <SubmitBtn loading={loading}>Xác minh OTP</SubmitBtn>
          <button type="button" onClick={() => setStep(1)}
            className="w-full text-sm text-gray-400 hover:text-gray-600 transition">
            ← Đổi email
          </button>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={step3} className="space-y-4">
          <div className="bg-green-50 rounded-xl p-3 text-sm text-green-700 text-center">
            ✅ OTP hợp lệ! Hãy đặt mật khẩu mới.
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Mật khẩu mới<span className="text-red-400 ml-1">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔒</span>
              <input
                type={showPass ? 'text' : 'password'}
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                required
                minLength={6}
                placeholder="Ít nhất 6 ký tự"
                autoComplete="new-password"
                className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <SubmitBtn loading={loading}>Đặt lại mật khẩu</SubmitBtn>
        </form>
      )}

      <p className="text-center mt-5">
        <Link to="/login" className="text-sm text-gray-400 hover:text-blue-600 transition">
          ← Quay lại đăng nhập
        </Link>
      </p>
    </AuthLayout>
  );
}