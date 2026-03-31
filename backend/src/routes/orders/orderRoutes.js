const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/orders/orderController');
const { protect, restrictTo } = require('../../middlewares/auth');

router.use(protect);

// Khách hàng
router.post('/',            ctrl.createOrder);         // Tạo đơn bán
router.get('/my-orders',    ctrl.getMyOrders);         // Đơn của mình
router.get('/:id',          ctrl.getOrderById);        // Chi tiết đơn
router.patch('/:id/cancel',   ctrl.cancelMyOrder);   // Hủy đơn (khách chỉ được hủy khi chưa thanh toán)

// Staff trở lên
router.get('/',             restrictTo('Admin', 'Manager', 'Staff'), ctrl.getAllOrders);
router.post('/import',      restrictTo('Admin', 'Manager', 'Staff'), ctrl.createImportOrder);
router.patch('/:id/status', restrictTo('Admin', 'Manager', 'Staff'), ctrl.updateOrderStatus);
router.post('/:id/payment', restrictTo('Admin', 'Manager', 'Staff'), ctrl.addPayment);

// Chỉ Admin/Manager
router.get('/stats/revenue', restrictTo('Admin', 'Manager'), ctrl.getRevenueStats);

module.exports = router;
