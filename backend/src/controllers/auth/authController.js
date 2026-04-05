const User     = require('../../models/auth/User');
const Customer = require('../../models/customers/Customer');
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const { sendResetPasswordEmail, sendResetOtp } = require('../../services/mailService');

// ─── Helper: tạo OTP 6 số ────────────────────────────────────────────────────
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const OTP_EXPIRE_MS = 5 * 60 * 1000; // 5 phút

// ─── 1. LOGIN ─────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập username và mật khẩu' });
        }

        const user = await User.findOne({ username })
            .populate('role_id', 'role_name')
            .populate('customer_id', 'full_name phone address');
        if (!user) {
            return res.status(401).json({ success: false, message: 'Thông tin đăng nhập không chính xác' });
        }
        if (user.status === 'Banned') {
            return res.status(403).json({ success: false, message: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.' });
        }
        // Chặn login nếu chưa verify OTP đăng ký
        if (!user.is_verified) {
            return res.status(403).json({
                success: false,
                message: 'Tài khoản chưa xác minh email. Vui lòng kiểm tra email và nhập mã OTP.',
                step: 'verify_otp',
                email: user.email
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Thông tin đăng nhập không chính xác' });
        }

        const token = jwt.sign(
            { id: user._id, role_name: user.role_id.role_name },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
        );

        res.status(200).json({
            success: true,
            message: 'Đăng nhập thành công',
            token,
            user: {
                _id:         user._id,
                username:    user.username,
                email:       user.email,
                role:        user.role_id.role_name,
                status:      user.status,
                customer_id: user.customer_id
            }
        });
    } catch (err) {
        console.error('[AUTH] Login error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
    }
};

// ─── 2. LOGOUT ────────────────────────────────────────────────────────────────
exports.logout = (req, res) => {
    res.status(200).json({ success: true, message: 'Đăng xuất thành công' });
};

// ─── 3. GET ME ────────────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('role_id', 'role_name')
            .populate('customer_id', 'full_name phone address')
            .select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
        res.json({ success: true, data: user });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

// ─── 4. FORGOT PASSWORD — Gửi OTP reset ──────────────────────────────────────
// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập email' });
        }

        const user = await User.findOne({ email });
        // Không tiết lộ email có tồn tại hay không
        if (!user) {
            return res.json({ success: true, message: 'Nếu email tồn tại, bạn sẽ nhận được mã OTP.' });
        }

        // Tạo OTP 6 số
        const otp = generateOtp();
        user.reset_otp     = otp;
        user.reset_otp_exp = new Date(Date.now() + OTP_EXPIRE_MS);
        await user.save();

        const customer = await Customer.findOne({ user_id: user._id });
        const fullName  = customer?.full_name || user.username;

        await sendResetOtp({ to: email, full_name: fullName, otp });

        res.json({
            success: true,
            message: 'Mã OTP đã được gửi về email. Mã có hiệu lực trong 5 phút.',
            step:    'verify_reset_otp',
            email
        });
    } catch (err) {
        console.error('[AUTH] forgotPassword error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

// ─── 5. XÁC MINH OTP RESET — Trả về reset_token tạm thời ────────────────────
// POST /api/auth/verify-reset-otp
exports.verifyResetOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập email và mã OTP' });
        }

        const user = await User.findOne({ email }).select('+reset_otp +reset_otp_exp');
        if (!user) {
            return res.status(404).json({ success: false, message: 'Email không tồn tại' });
        }
        if (!user.reset_otp || user.reset_otp !== otp) {
            return res.status(400).json({ success: false, message: 'Mã OTP không đúng' });
        }
        if (new Date() > user.reset_otp_exp) {
            return res.status(400).json({ success: false, message: 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.' });
        }

        // Tạo reset_token ngắn hạn (10 phút) để dùng ở bước đổi mật khẩu
        const resetToken  = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        user.reset_otp              = undefined;
        user.reset_otp_exp          = undefined;
        user.reset_password_token   = hashedToken;
        user.reset_password_expires = new Date(Date.now() + 10 * 60 * 1000); // 10 phút
        await user.save();

        res.json({
            success:      true,
            message:      'OTP hợp lệ. Vui lòng đặt mật khẩu mới.',
            step:         'reset_password',
            reset_token:  resetToken   // Frontend dùng token này ở bước tiếp theo
        });
    } catch (err) {
        console.error('[AUTH] verifyResetOtp error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

// ─── 6. RESET PASSWORD — Đặt mật khẩu mới bằng reset_token ──────────────────
// POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
    try {
        const { token, new_password } = req.body;
        if (!token || !new_password) {
            return res.status(400).json({ success: false, message: 'Thiếu token hoặc mật khẩu mới' });
        }
        if (new_password.length < 6) {
            return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' });
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const user = await User.findOne({
            reset_password_token:   hashedToken,
            reset_password_expires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Token không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu mã OTP mới.'
            });
        }

        user.password               = await bcrypt.hash(new_password, 12);
        user.reset_password_token   = undefined;
        user.reset_password_expires = undefined;
        await user.save();

        res.json({ success: true, message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.' });
    } catch (err) {
        console.error('[AUTH] resetPassword error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

// ─── 7. GỬI LẠI OTP RESET ────────────────────────────────────────────────────
// POST /api/auth/resend-reset-otp
exports.resendResetOtp = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'Vui lòng nhập email' });

        const user = await User.findOne({ email }).select('+reset_otp_exp');
        if (!user) return res.json({ success: true, message: 'Nếu email tồn tại, mã OTP mới sẽ được gửi.' });

        // Rate limit: không cho gửi lại trong vòng 1 phút
        if (user.reset_otp_exp && (user.reset_otp_exp - Date.now()) > 4 * 60 * 1000) {
            return res.status(429).json({
                success: false,
                message: 'Vui lòng đợi ít nhất 1 phút trước khi gửi lại mã OTP'
            });
        }

        const otp = generateOtp();
        user.reset_otp     = otp;
        user.reset_otp_exp = new Date(Date.now() + OTP_EXPIRE_MS);
        await user.save();

        const customer = await Customer.findOne({ user_id: user._id });
        await sendResetOtp({ to: email, full_name: customer?.full_name || user.username, otp });

        res.json({ success: true, message: 'Đã gửi lại mã OTP về email.' });
    } catch (err) {
        console.error('[AUTH] resendResetOtp error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};
