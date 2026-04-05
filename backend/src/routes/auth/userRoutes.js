const express = require('express');
const router = express.Router();
const userController = require('../../controllers/auth/userController');
const { protect, checkPermission, restrictToAdmin } = require('../../middlewares/auth');

router.use(protect);

// 1. Lấy danh sách hoặc tìm kiếm User
// Cải tiến logic: Nếu là Admin/Manager thì cho xem hết. 
// Nếu là User thường thì chỉ cho phép search username của chính mình.
router.get('/', (req, res, next) => {
    if (['Admin', 'Manager'].includes(req.user.role_name)) {
        return next();
    }
    // Nếu không phải Admin/Manager, ép buộc query phải là username của chính mình
    if (req.query.username === req.user.username) {
        return next();
    }
    res.status(403).json({ success: false, message: "Bạn không có quyền xem danh sách!" });
}, userController.searchUsers);

// 2. Các hành động quản lý tài khoản
// checkPermission đã được thiết lập để cho phép User tự sửa chính mình (profile, pass)
router.patch('/:id/username', checkPermission, userController.updateUsername);
router.put('/:id/password', checkPermission, userController.changePassword);

// 3. Quản trị trạng thái (Khóa tài khoản)
router.patch('/:id/status', checkPermission, userController.updateStatus);

// 4. Đổi Role (Cực kỳ nhạy cảm -> Chỉ DUY NHẤT Admin)
router.patch('/:id/role', restrictToAdmin, userController.updateUserRole);

module.exports = router;