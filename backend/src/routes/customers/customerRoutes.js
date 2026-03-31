const express = require('express');
const router  = express.Router();
const ctrl    = require('../../controllers/customers/customerController');
const { protect, restrictTo, checkPermission } = require('../../middlewares/auth');

// ── Đăng ký qua OTP (3 bước, public) ─────────────────────────────────────────
router.post('/register',     ctrl.createCustomer);      // Bước 1: đăng ký → gửi OTP
router.post('/verify-otp',   ctrl.verifyRegisterOtp);   // Bước 2: xác minh OTP → kích hoạt
router.post('/resend-otp',   ctrl.resendRegisterOtp);   // Gửi lại OTP

// ── Tất cả route dưới cần đăng nhập ──────────────────────────────────────────
router.use(protect);

router.get('/',                restrictTo('Admin', 'Manager'), ctrl.listCustomers);
router.patch('/:id/spending',  restrictTo('Admin', 'Manager'), ctrl.updateSpending);
router.get('/:id',             checkPermission,                ctrl.getCustomerById);
router.get('/:id/orders',      checkPermission,                ctrl.getCustomerOrders);
router.put('/:id',             checkPermission,                ctrl.updateCustomer);
router.delete('/:id',          restrictTo('Admin'),            ctrl.deleteCustomer);
router.post('/',               restrictTo('Admin', 'Manager', 'Staff'), ctrl.createCustomer);

module.exports = router;
