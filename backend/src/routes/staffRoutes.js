const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { protect, restrictTo, checkPermission } = require('../middlewares/auth');

// TẤT CẢ các thao tác với Staff đều phải đăng nhập
router.use(protect);

// --- NHÓM 1: QUẢN TRỊ CẤP CAO (Admin, Manager) ---
// Chỉ quản lý mới được xem danh sách tất cả nhân viên và tạo nhân viên mới
router.get('/', 
    restrictTo('Admin', 'Manager'), 
    staffController.listStaff
);

router.post('/', 
    restrictTo('Admin', 'Manager'), 
    staffController.createStaff
);

// --- NHÓM 2: PHỐI HỢP (Admin, Manager hoặc Chính chủ nhân viên) ---
// Sử dụng checkPermission để nhân viên tự xem/sửa thông tin cá nhân của mình
// nhưng vẫn cho phép Admin/Manager quản lý họ.

router.get('/:id', 
    checkPermission, 
    staffController.getStaffById
);

router.put('/:id', 
    checkPermission, 
    staffController.updateStaff
);

// --- NHÓM 3: TỐI CAO (Chỉ Admin) ---
// Việc xóa nhân viên (đồng nghĩa xóa tài khoản User) là hành động cực kỳ quan trọng
router.delete('/:id', 
    restrictTo('Admin'), 
    staffController.deleteStaff
);

module.exports = router;