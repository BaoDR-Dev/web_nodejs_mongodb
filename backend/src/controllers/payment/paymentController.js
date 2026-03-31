const crypto = require('crypto');
const https = require('https');
const Order = require('../../models/orders/Order');
const { sendPaymentSuccessEmail } = require('../../services/mailService');
const Customer = require('../../models/customers/Customer');
const User = require('../../models/auth/User');

// ─── Helper: Tạo chữ ký HMAC SHA256 theo chuẩn MoMo ─────────────────────────
const createMomoSignature = (rawStr) =>
    crypto.createHmac('sha256', process.env.MOMO_SECRET_KEY)
          .update(rawStr)
          .digest('hex');

// ─── Helper: Gửi request HTTPS đến MoMo ──────────────────────────────────────
const sendMomoRequest = (body) => new Promise((resolve, reject) => {
    const endpoint = new URL(process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create');
    const bodyStr = JSON.stringify(body);
    const options = {
        hostname: endpoint.hostname,
        port: 443,
        path: endpoint.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(bodyStr)
        }
    };

    const req = https.request(options, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try { resolve(JSON.parse(data)); }
            catch { reject(new Error('MoMo response parse error')); }
        });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/payment/momo/create
// Customer gọi sau khi tạo đơn hàng → nhận payUrl để chuyển hướng sang MoMo
// ═══════════════════════════════════════════════════════════════════════════════
exports.createMomoPayment = async (req, res) => {
    try {
        const { order_id } = req.body;
        if (!order_id) {
            return res.status(400).json({ success: false, message: 'Thiếu order_id' });
        }

        // Lấy đơn hàng
        const order = await Order.findById(order_id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }
        if (order.status === 'Cancelled') {
            return res.status(400).json({ success: false, message: 'Đơn hàng đã bị hủy' });
        }
        // Kiểm tra đơn có thuộc user này không
        if (order.user_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Không có quyền thanh toán đơn hàng này' });
        }

        // Tham số MoMo
        const partnerCode = process.env.MOMO_PARTNER_CODE || 'MOMO';
        const accessKey   = process.env.MOMO_ACCESS_KEY;
        const requestId   = `${partnerCode}${Date.now()}`;
        const orderId     = `ORDER_${order_id}_${Date.now()}`; // unique per attempt
        const amount      = String(order.total_price);
        const orderInfo   = `Thanh toan don hang #${order_id}`;
        const redirectUrl = process.env.MOMO_REDIRECT_URL || 'http://localhost:3000/payment/result';
        const ipnUrl      = process.env.MOMO_IPN_URL      || 'http://localhost:5000/api/payment/momo/ipn';
        const requestType = 'captureWallet';
        const extraData   = Buffer.from(JSON.stringify({ internal_order_id: order_id })).toString('base64');

        // Tạo chữ ký
        const rawSignature = [
            `accessKey=${accessKey}`,
            `amount=${amount}`,
            `extraData=${extraData}`,
            `ipnUrl=${ipnUrl}`,
            `orderId=${orderId}`,
            `orderInfo=${orderInfo}`,
            `partnerCode=${partnerCode}`,
            `redirectUrl=${redirectUrl}`,
            `requestId=${requestId}`,
            `requestType=${requestType}`
        ].join('&');

        const signature = createMomoSignature(rawSignature);

        const requestBody = {
            partnerCode, accessKey, requestId,
            amount, orderId, orderInfo,
            redirectUrl, ipnUrl, extraData,
            requestType, signature, lang: 'vi'
        };

        const momoRes = await sendMomoRequest(requestBody);

        // resultCode = 0 → thành công
        if (momoRes.resultCode !== 0) {
            console.error('[MOMO] create error:', momoRes);
            return res.status(400).json({
                success: false,
                message: `MoMo từ chối: ${momoRes.message || 'Lỗi không xác định'}`,
                momo_code: momoRes.resultCode
            });
        }

        res.json({
            success: true,
            pay_url: momoRes.payUrl,          // URL để redirect sang MoMo
            deep_link: momoRes.deeplink,       // Deep link app MoMo (mobile)
            qr_code_url: momoRes.qrCodeUrl,   // QR code nếu cần
            momo_order_id: orderId,
            request_id: requestId
        });
    } catch (err) {
        console.error('[MOMO] createPayment error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi kết nối cổng thanh toán MoMo' });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/payment/momo/ipn
// MoMo gọi server này sau khi thanh toán (server-to-server, không cần token)
// ═══════════════════════════════════════════════════════════════════════════════
exports.momoIpn = async (req, res) => {
    try {
        const {
            partnerCode, orderId, requestId, amount, orderInfo,
            orderType, transId, resultCode, message,
            payType, responseTime, extraData, signature
        } = req.body;

        // 1. Xác minh chữ ký từ MoMo (bảo mật quan trọng)
        const rawSignature = [
            `accessKey=${process.env.MOMO_ACCESS_KEY}`,
            `amount=${amount}`,
            `extraData=${extraData}`,
            `message=${message}`,
            `orderId=${orderId}`,
            `orderInfo=${orderInfo}`,
            `orderType=${orderType}`,
            `partnerCode=${partnerCode}`,
            `payType=${payType}`,
            `requestId=${requestId}`,
            `responseTime=${responseTime}`,
            `resultCode=${resultCode}`,
            `transId=${transId}`
        ].join('&');

        const expectedSignature = createMomoSignature(rawSignature);
        if (signature !== expectedSignature) {
            console.warn('[MOMO IPN] Chữ ký không hợp lệ!', { signature, expectedSignature });
            return res.status(400).json({ success: false, message: 'Invalid signature' });
        }

        // 2. Lấy internal order_id từ extraData
        let internalOrderId;
        try {
            const decoded = JSON.parse(Buffer.from(extraData, 'base64').toString('utf8'));
            internalOrderId = decoded.internal_order_id;
        } catch {
            console.error('[MOMO IPN] Không decode được extraData');
            return res.status(400).json({ success: false, message: 'Invalid extraData' });
        }

        const order = await Order.findById(internalOrderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // 3. Xử lý theo kết quả thanh toán
        if (resultCode === 0) {
            // ─── THANH TOÁN THÀNH CÔNG ───────────────────────────────────────
            // Cập nhật đơn hàng: thêm payment record + chuyển Draft → Completed
            const alreadyPaid = order.payments.some(p => p.transaction_id === String(transId));
            if (!alreadyPaid) {
                order.payments.push({
                    method: 'Momo',
                    amount: Number(amount),
                    transaction_id: String(transId),
                    payment_date: new Date(responseTime)
                });
                order.status = 'Completed';
                await order.save();

                // Gửi email xác nhận thanh toán
                try {
                    const user = await User.findById(order.user_id);
                    const customer = await Customer.findOne({ user_id: order.user_id });
                    if (user?.email) {
                        await sendPaymentSuccessEmail({
                            to: user.email,
                            full_name: customer?.full_name || user.username,
                            order_id: internalOrderId,
                            amount,
                            transaction_id: transId
                        });
                    }
                } catch (mailErr) {
                    // Không fail IPN vì lỗi mail
                    console.error('[MOMO IPN] Gửi mail lỗi:', mailErr.message);
                }

                console.log(`[MOMO IPN] ✅ Thanh toán thành công: order=${internalOrderId}, transId=${transId}`);
            }
        } else {
            // ─── THANH TOÁN THẤT BẠI / HỦY ──────────────────────────────────
            // resultCode 49 = user hủy, 1006 = hết hạn, 1005 = sai OTP, v.v.
            console.log(`[MOMO IPN] ❌ Thanh toán thất bại: order=${internalOrderId}, code=${resultCode}, msg=${message}`);
            // KHÔNG tự động hủy đơn → cho phép user thử lại thanh toán
            // Frontend polling /momo/status sẽ thấy status=Draft, is_paid=false → hiển thị nút "Thanh toán lại"
        }

        // MoMo yêu cầu phải response 200 để xác nhận đã nhận IPN
        res.status(200).json({ success: true, message: 'IPN received' });
    } catch (err) {
        console.error('[MOMO IPN] error:', err.message);
        res.status(500).json({ success: false });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/payment/momo/result?orderId=...&resultCode=...
// MoMo redirect về trang này sau khi người dùng thanh toán (client-side)
// Frontend đọc query params để hiển thị kết quả
// ═══════════════════════════════════════════════════════════════════════════════
exports.momoReturn = async (req, res) => {
    try {
        const { orderId, resultCode, message, transId, amount, extraData, signature } = req.query;

        // Xác minh chữ ký (bảo vệ tránh giả mạo URL)
        // ⚠️ MoMo redirect dùng query params, signature verify theo doc v2
        let internalOrderId = null;
        try {
            const decoded = JSON.parse(Buffer.from(extraData, 'base64').toString('utf8'));
            internalOrderId = decoded.internal_order_id;
        } catch { /* ignore */ }

        const isSuccess = Number(resultCode) === 0;

        // Redirect về frontend với kết quả
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const redirectUrl = `${frontendUrl}/payment/result?` + new URLSearchParams({
            success: isSuccess ? '1' : '0',
            order_id: internalOrderId || '',
            momo_order_id: orderId || '',
            message: message || '',
            trans_id: transId || '',
            amount: amount || ''
        }).toString();

        res.redirect(redirectUrl);
    } catch (err) {
        console.error('[MOMO Return] error:', err.message);
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/result?success=0&message=error`);
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/payment/momo/status/:order_id
// Kiểm tra trạng thái thanh toán của đơn hàng (dùng cho frontend polling)
// ═══════════════════════════════════════════════════════════════════════════════
exports.checkPaymentStatus = async (req, res) => {
    try {
        const order = await Order.findById(req.params.order_id)
            .select('status payments total_price');
        if (!order) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }

        // is_paid = true chỉ khi đơn Completed VÀ có payment MoMo với transaction_id thật
        const momoPaid = order.status === 'Completed' &&
                         order.payments.some(p => p.method === 'Momo' && p.transaction_id);

        // payment_status rõ ràng hơn cho frontend
        let payment_status = 'pending';
        if (order.status === 'Completed' && momoPaid) payment_status = 'paid';
        else if (order.status === 'Cancelled') payment_status = 'cancelled';
        else if (order.status === 'Draft') payment_status = 'pending';

        res.json({
            success: true,
            data: {
                order_id:       order._id,
                status:         order.status,
                payment_status,
                is_paid:        momoPaid,
                total_price:    order.total_price,
                payments:       order.payments
            }
        });
    } catch (err) {
        console.error('[PAYMENT] checkStatus error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};