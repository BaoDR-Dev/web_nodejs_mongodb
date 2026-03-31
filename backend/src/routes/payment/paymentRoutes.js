const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/payment/paymentController');
const { protect } = require('../../middlewares/auth');

router.post('/momo/create', protect, ctrl.createMomoPayment);
router.post('/momo/ipn',            ctrl.momoIpn);
router.get('/momo/return',          ctrl.momoReturn);
router.get('/momo/status/:order_id', protect, ctrl.checkPaymentStatus);

module.exports = router;
