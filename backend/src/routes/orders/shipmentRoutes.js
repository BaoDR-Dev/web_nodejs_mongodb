const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/orders/shipmentController');
const { protect, restrictTo } = require('../../middlewares/auth');

router.use(protect);

// Khách xem vận đơn theo đơn hàng
router.get('/order/:order_id', ctrl.getShipmentByOrder);

// Staff trở lên
router.get('/', restrictTo('Admin', 'Manager', 'Staff'), ctrl.getAllShipments);
router.post('/', restrictTo('Admin', 'Manager', 'Staff'), ctrl.createShipment);
router.put('/:id', restrictTo('Admin', 'Manager', 'Staff'), ctrl.updateShipment);
router.patch('/:id/status', restrictTo('Admin', 'Manager', 'Staff'), ctrl.updateShipmentStatus);

module.exports = router;
