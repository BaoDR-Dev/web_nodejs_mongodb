const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/common/voucherController');
const { protect, restrictTo } = require('../../middlewares/auth');

const managerAdmin = restrictTo('Admin', 'Manager');

// Public: khách kiểm tra voucher khi thanh toán
router.post('/apply', protect, ctrl.applyVoucher);

// Cần đăng nhập + quyền Manager/Admin
router.use(protect, managerAdmin);
router.get('/', ctrl.getAllVouchers);                   // Danh sách
router.get('/:id/stats', ctrl.getVoucherStats);         // Thống kê
router.post('/', ctrl.createVoucher);                   // Tạo mới
router.put('/:id', ctrl.updateVoucher);                 // Cập nhật
router.patch('/:id/toggle', ctrl.toggleVoucher);        // Bật/tắt
router.delete('/:id', ctrl.deleteVoucher);              // Xóa

module.exports = router;
