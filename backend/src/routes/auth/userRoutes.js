const express = require('express');
const router = express.Router();
const userController = require('../../controllers/auth/userController');
const { protect, checkPermission, restrictToAdmin } = require('../../middlewares/auth');

// Tất cả API dưới đây đều yêu cầu phải ĐĂNG NHẬP
router.use(protect);

// --- NHÓM 1: CÁ NHÂN TỰ QUẢN LÝ (HOẶC SẾP QUẢN LÝ) ---
// Dùng checkPermission để: Customer/Staff tự đổi mình OK, Manager đổi cho Staff OK.
router.patch('/:id/username', checkPermission, userController.updateUsername);
router.put('/:id/password', checkPermission, userController.changePassword);

// --- NHÓM 2: QUẢN TRỊ VIÊN ---
// Lấy danh sách user: Chỉ Admin/Manager (Staff/Customer không được xem hết)
router.get('/', (req, res, next) => {
    if (['Admin', 'Manager'].includes(req.user.role_name)) return next();
    res.status(403).json({ message: "Bạn không có quyền xem danh sách!" });
}, userController.searchUsers);

// Khóa tài khoản: checkPermission đảm bảo Manager không khóa được Admin
router.patch('/:id/status', checkPermission, userController.updateStatus);

// Đổi Role: Cực kỳ nhạy cảm -> Chỉ DUY NHẤT Admin
router.patch('/:id/role', restrictToAdmin, userController.updateUserRole);

module.exports = router;