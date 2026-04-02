const express = require('express');
const router  = express.Router();
const ctrl    = require('../../controllers/payment/paymentController');
const { protect } = require('../../middlewares/auth');

// ── Khởi tạo thanh toán MoMo (cart data → pending session → payUrl)
router.post('/momo/init',    protect, ctrl.initMomoPayment);

// ── IPN: MoMo gọi server-to-server (không cần token)
router.post('/momo/ipn',             ctrl.momoIpn);

// ── Return: MoMo redirect về sau khi user xong trên app MoMo
router.get('/momo/return',           ctrl.momoReturn);

// ── Verify & tạo đơn ngay từ frontend (fallback khi IPN không đến được - dev/localhost)
router.post('/momo/verify-return',   protect, ctrl.verifyAndCreateOrder);

// ── Frontend polling: kiểm tra pending session (momo_order_id)
router.get('/momo/session-status/:momo_order_id', protect, ctrl.checkSessionStatus);

// ── Giữ lại để không break các chỗ khác (admin / order detail)
router.get('/momo/status/:order_id', protect, ctrl.checkPaymentStatus);

module.exports = router;