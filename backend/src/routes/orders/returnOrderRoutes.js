const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/orders/returnOrderController');
const { protect, restrictTo } = require('../../middlewares/auth');

router.use(protect);

// Khách hàng tạo và xem yêu cầu của mình
router.post('/', ctrl.createReturn);
router.get('/customer/:customer_id', ctrl.getReturnsByCustomer);

// Staff/Manager/Admin quản lý
router.get('/', restrictTo('Admin', 'Manager', 'Staff'), ctrl.getAllReturns);
router.get('/:id', restrictTo('Admin', 'Manager', 'Staff'), ctrl.getReturnById);
router.patch('/:id/process', restrictTo('Admin', 'Manager'), ctrl.processReturn);
router.patch('/:id/complete', restrictTo('Admin', 'Manager', 'Staff'), ctrl.completeReturn);

module.exports = router;
