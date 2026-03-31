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
exports.checkPermission = async (req, res, next) => {
    try {
        const currentUserId = req.user.id; // ID Admin đang đăng nhập
        const currentUserRole = req.user.role_name; // 'Admin'
        const targetUserId = req.params.id; // ID User muốn đổi pass

        // QUY TẮC 0: NẾU LÀ ADMIN -> CHO QUA LUÔN (QUYỀN TỐI THƯỢNG)
        if (currentUserRole === 'Admin') {
            return next();
        }

        // QUY TẮC 1: NẾU TỰ SỬA CHO CHÍNH MÌNH (Customer, Staff tự sửa mình)
        if (currentUserId === targetUserId) {
            return next();
        }

        // QUY TẮC 2: KIỂM TRA PHÂN CẤP (Manager sửa Staff)
        const targetUser = await User.findById(targetUserId).populate('role_id');
        if (!targetUser) return res.status(404).json({ message: "User không tồn tại" });
        
        const targetUserRole = targetUser.role_id.role_name;

        // Bảng ưu tiên: Admin: 3, Manager: 2, Staff: 1, Customer: 0
        if (rolesPriority[currentUserRole] > rolesPriority[targetUserRole]) {
            return next();
        }

        // Nếu không thỏa mãn các điều kiện trên -> Chặn
        return res.status(403).json({ 
            success: false, 
            message: "Bạn không có quyền thao tác trên tài khoản này!" 
        });
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