const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/warehouse/stockMovementController');
const { protect, restrictTo } = require('../../middlewares/auth');

router.use(protect, restrictTo('Admin', 'Manager', 'Staff'));

router.get('/', ctrl.getAllMovements);                              // Lịch sử toàn kho
router.get('/audit', ctrl.stockAudit);                             // Kiểm kho
router.get('/variant/:variant_id', ctrl.getMovementsByVariant);    // Lịch sử theo sản phẩm
router.post('/', ctrl.recordMovement);                             // Ghi nhận biến động
router.post('/transfer', ctrl.transferStock);                      // Chuyển kho

module.exports = router;
