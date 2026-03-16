const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// 1. LOGIN API
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Tìm user theo username và lấy luôn thông tin Role
        const user = await User.findOne({ username }).populate('role_id');
        
        if (!user) {
            return res.status(401).json({ success: false, message: "Tài khoản không tồn tại" });
        }

        // Kiểm tra trạng thái tài khoản
        if (user.status === 'Banned') {
            return res.status(403).json({ success: false, message: "Tài khoản đã bị khóa" });
        }

        // So sánh mật khẩu
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Mật khẩu không chính xác" });
        }

        // Tạo JWT Token (Hết hạn sau 1 ngày)
        console.log("Secret key là:", process.env.JWT_SECRET); 
        const token = jwt.sign(
            { 
                id: user._id, 
                role_name: user.role_id.role_name 
            },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.status(200).json({
            success: true,
            message: "Đăng nhập thành công",
            token,
            user: {
                id: user._id,
                username: user.username,
                role: user.role_id.role_name
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 2. LOGOUT API
exports.logout = async (req, res) => {
    // Với JWT, Logout chủ yếu được xử lý ở phía Client (xóa Token ở LocalStorage/Cookie)
    // Ở phía Server, chúng ta chỉ cần trả về thông báo thành công.
    res.status(200).json({ success: true, message: "Đã đăng xuất thành công" });
};