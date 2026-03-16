const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { protect, restrictTo, checkPermission } = require('../middlewares/auth');

// ==========================================
// 1. ROUTE CÔNG KHAI (KHÔNG CẦN TOKEN)
// ==========================================
router.post('/register', customerController.createCustomer);

// ==========================================
// TẤT CẢ ROUTE DƯỚI ĐÂY ĐỀU CẦN ĐĂNG NHẬP
// ==========================================
router.use(protect);

// --- NHÓM QUẢN TRỊ (Admin, Manager) ---
router.get('/', 
    restrictTo('Admin', 'Manager'), 
    customerController.listCustomers
);

// API SỬA ĐIỂM (Chỉ Admin/Manager mới được gọi)
router.patch('/:id/spending', 
    restrictTo('Admin', 'Manager'), 
    customerController.updateSpending
);

// --- NHÓM QUYỀN HẠN PHỐI HỢP (Admin hoặc Chính chủ) ---
// Xem chi tiết khách hàng
router.get('/:id', 
    checkPermission, 
    customerController.getCustomerById
);

// Xem đơn hàng của khách
router.get('/:id/orders', 
    checkPermission, 
    customerController.getCustomerOrders
);

// Cập nhật thông tin cá nhân (Tên, SĐT, Địa chỉ)
router.put('/:id', 
    checkPermission, 
    customerController.updateCustomer
);

// --- NHÓM TỐI CAO (Chỉ Admin) ---
router.delete('/:id', 
    restrictTo('Admin'), 
    customerController.deleteCustomer
);

// Admin tạo khách hàng mới hộ khách
router.post('/', 
    restrictTo('Admin', 'Manager', 'Staff'), 
    customerController.createCustomer
);

module.exports = router;