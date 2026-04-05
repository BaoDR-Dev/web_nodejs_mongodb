const jwt = require('jsonwebtoken');
const User = require('../models/auth/User');

const rolesPriority = {
    'Admin': 3,
    'Manager': 2,
    'Staff': 1,
    'Customer': 0
};

// 1. Xác thực Token (Người dùng phải đăng nhập mới làm được việc)
exports.protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) return res.status(401).json({ message: "Bạn cần đăng nhập!" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Lấy thông tin user + role_name để các bước sau sử dụng
        req.user = await User.findById(decoded.id).populate('role_id');
        req.user.role_name = req.user.role_id.role_name; 
        next();
    } catch (err) {
        return res.status(401).json({ message: "Token không hợp lệ!" });
    }
};

// 2. Kiểm tra Phân cấp (Chính chủ hoặc Cấp trên)
// Sửa file src/middlewares/auth.js
exports.checkPermission = async (req, res, next) => {
    try {
        const currentUserId = req.user._id.toString(); // Dùng _id.toString() cho chắc chắn
        const currentUserRole = req.user.role_name;
        const targetUserId = req.params.id;

        // 1. Nếu là chính chủ -> CHO QUA (Bất kể là ai)
        if (currentUserId === targetUserId) {
            return next();
        }

        // 2. Nếu là Admin -> CHO QUA
        if (currentUserRole === 'Admin') {
            return next();
        }

        // 3. Phân cấp Manager sửa Staff
        const targetUser = await User.findById(targetUserId).populate('role_id');
        if (!targetUser) return res.status(404).json({ message: "User không tồn tại" });
        
        const targetUserRole = targetUser.role_id.role_name;

        if (rolesPriority[currentUserRole] > rolesPriority[targetUserRole]) {
            return next();
        }

        return res.status(403).json({ success: false, message: "Bạn không có quyền!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. Chỉ Admin (Dành cho đổi Role)
exports.restrictToAdmin = (req, res, next) => {
    if (req.user.role_name !== 'Admin') {
        return res.status(403).json({ message: "Chỉ Admin mới có quyền này!" });
    }
    next();
};

// Thêm vào middleware/auth.js
exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role_name)) {
            return res.status(403).json({ message: "Bạn không có quyền thực hiện hành động này" });
        }
        next();
    };
};

exports.checkCustomerAccess = async (req, res, next) => {
    try {
        const currentUserRole = req.user.role_name;
        
        // 1. Admin/Manager/Staff được phép xem mọi thông tin khách hàng
        if (['Admin', 'Manager', 'Staff'].includes(currentUserRole)) {
            return next();
        }

        // 2. Nếu là Customer, chỉ được xem/sửa profile của chính mình
        // Chúng ta so sánh ID trên URL với customer_id của User đang đăng nhập
        if (req.user.customer_id && req.user.customer_id.toString() === req.params.id) {
            return next();
        }

        return res.status(403).json({ success: false, message: "Bạn không có quyền truy cập hồ sơ này!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};