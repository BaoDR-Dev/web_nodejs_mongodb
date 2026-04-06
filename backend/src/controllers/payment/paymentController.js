const crypto   = require('crypto');
const https    = require('https');
const mongoose = require('mongoose');

const MomoPendingSession = require('../../models/orders/MomoPendingSession');
const Order              = require('../../models/orders/Order');
const ProductVariant     = require('../../models/products/ProductVariant');
const Inventory          = require('../../models/warehouse/Inventory');
const StockMovement      = require('../../models/warehouse/StockMovement');
const Voucher            = require('../../models/common/Voucher');
const Cart               = require('../../models/orders/Cart');
const Customer           = require('../../models/customers/Customer');
const User               = require('../../models/auth/User');

const { sendPaymentSuccessEmail } = require('../../services/mailService');

// ─── Helper: Tạo chữ ký HMAC SHA256 ─────────────────────────────────────────
const createMomoSignature = (rawStr) =>
    crypto.createHmac('sha256', process.env.MOMO_SECRET_KEY)
          .update(rawStr)
          .digest('hex');

// ─── Helper: Gửi request HTTPS đến MoMo ──────────────────────────────────────
const sendMomoRequest = (body) => new Promise((resolve, reject) => {
    const endpoint = new URL(process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create');
    const bodyStr  = JSON.stringify(body);
    const options  = {
        hostname: endpoint.hostname, port: 443, path: endpoint.pathname, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) }
    };
    const req = https.request(options, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(new Error('MoMo response parse error')); } });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
});

// ─── Helper: Phân bổ tồn kho từ nhiều kệ ────────────────────────────────────
const allocateInventory = async (variant_id, quantity, session) => {
    const shelves = await Inventory.find({ variant_id, quantity: { $gt: 0 } })
        .populate({ path: 'location_id', select: 'warehouse_id location_name status' })
        .session(session).sort({ quantity: -1 });
    let remaining = quantity;
    const result  = [];
    for (const inv of shelves) {
        if (remaining <= 0) break;
        const take = Math.min(inv.quantity, remaining);
        result.push({ inventory: inv, takeQty: take });
        remaining -= take;
    }
    return remaining === 0 ? result : null;
};

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL: Tạo đơn hàng thật từ pending session — chỉ gọi khi IPN resultCode=0
// ═══════════════════════════════════════════════════════════════════════════════
const createOrderFromPendingSession = async (pendingSession, transId, amount, responseTime) => {
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();
    try {
        const { items, voucher_code, shipping_address, user_id } = pendingSession;

        // ── BƯỚC 1: Validate và phân bổ tồn kho ──────────────────────────────
        let orderDetails = [];
        let serverTotal  = 0;

        for (const item of items) {
            const variant = await ProductVariant.findById(item.variant_id).session(dbSession);
            if (!variant) { await dbSession.abortTransaction(); throw new Error(`Không tìm thấy sản phẩm: ${item.variant_id}`); }

            const allocated = await allocateInventory(item.variant_id, item.quantity, dbSession);
            if (!allocated) { await dbSession.abortTransaction(); throw new Error(`Sản phẩm "${variant.sku}" không đủ tồn kho`); }

            const updatedVariant = await ProductVariant.findOneAndUpdate(
                { _id: item.variant_id, stock_quantity: { $gte: item.quantity } },
                { $inc: { stock_quantity: -item.quantity } },
                { new: true, session: dbSession }
            );
            if (!updatedVariant) { await dbSession.abortTransaction(); throw new Error(`Sản phẩm "${variant.sku}" vừa hết hàng`); }

            for (const { inventory, takeQty } of allocated) {
                await Inventory.findByIdAndUpdate(inventory._id, { $inc: { quantity: -takeQty } }, { session: dbSession });
                await StockMovement.create([{
                    variant_id:     variant._id,
                    location_id:    inventory.location_id?._id || inventory.location_id,
                    warehouse_id:   inventory.location_id?.warehouse_id || null,
                    movement_type:  'OUT',
                    quantity_change: -takeQty,
                    quantity_before: inventory.quantity,
                    quantity_after:  inventory.quantity - takeQty,
                    reason:         'Xuất kho theo đơn hàng MoMo',
                    created_by:     user_id
                }], { session: dbSession });
            }

            const unit_price = updatedVariant.price;
            serverTotal += unit_price * item.quantity;
            for (const { inventory, takeQty } of allocated) {
                orderDetails.push({ variant_id: variant._id, location_id: inventory.location_id?._id || inventory.location_id, quantity: takeQty, unit_price });
            }
        }

        // ── BƯỚC 2: Xử lý voucher ─────────────────────────────────────────────
        let discount_amount = 0, voucher_id = null;
        if (voucher_code) {
            const voucher = await Voucher.findOne({
                code: voucher_code.toUpperCase(), is_active: true,
                expires_at: { $gt: new Date() }, starts_at: { $lte: new Date() },
                $expr: { $lt: ['$used_count', '$max_uses'] }
            }).session(dbSession);

            if (!voucher) { await dbSession.abortTransaction(); throw new Error('Voucher không còn hợp lệ'); }
            if (voucher.used_by.some(id => id.toString() === user_id.toString())) { await dbSession.abortTransaction(); throw new Error('Voucher đã được sử dụng'); }
            if (serverTotal < voucher.min_order_value) { await dbSession.abortTransaction(); throw new Error('Đơn hàng không đủ điều kiện dùng voucher'); }

            if (voucher.discount_type === 'percent') {
                discount_amount = (serverTotal * voucher.discount_value) / 100;
                if (voucher.max_discount) discount_amount = Math.min(discount_amount, voucher.max_discount);
            } else { discount_amount = voucher.discount_value; }
            discount_amount = Math.min(Math.round(discount_amount), serverTotal);

            await Voucher.findByIdAndUpdate(voucher._id, { $inc: { used_count: 1 }, $addToSet: { used_by: user_id } }, { session: dbSession });
            voucher_id = voucher._id;
        }

        const total_price = serverTotal - discount_amount;

        // ── BƯỚC 3: Tạo đơn hàng ──────────────────────────────────────────────
        const customer = await Customer.findOne({ user_id }).session(dbSession);
        const newOrder = await Order.create([{
            order_type: 'OUT', user_id,
            customer_id: customer?._id,
            voucher_id, discount_amount, total_price,
            status:  'Draft',            // Chờ vận chuyển — không set Completed ngay
            details: orderDetails,
            shipping_address,
            payments: [{ method: 'Momo', amount: Number(amount), transaction_id: String(transId), payment_date: new Date(responseTime) }]
        }], { session: dbSession });

        const orderId = newOrder[0]._id;

        // ── BƯỚC 4: Xóa mềm khỏi giỏ hàng ────────────────────────────────────
        const variantIds = items.map(i => i.variant_id.toString());
        await Cart.updateOne(
            { user_id },
            { $set: { 'items.$[elem].is_deleted': true } },
            { arrayFilters: [{ 'elem.variant_id': { $in: variantIds }, 'elem.is_deleted': false }], session: dbSession }
        );

        // ── BƯỚC 5: Cập nhật tổng chi tiêu ────────────────────────────────────
        if (customer) {
            await Customer.findByIdAndUpdate(customer._id, { $inc: { total_spending: total_price } }, { session: dbSession });
        }

        // ── BƯỚC 6: Đánh dấu pending session đã hoàn tất ─────────────────────
        pendingSession.status   = 'paid';
        pendingSession.order_id = orderId;
        await pendingSession.save({ session: dbSession });

        await dbSession.commitTransaction();

        // Gửi email xác nhận (không block response)
        try {
            const userDoc = await User.findById(user_id);
            const customerDoc = await Customer.findOne({ user_id });
            if (userDoc?.email) {
                sendPaymentSuccessEmail({
                    to:             userDoc.email,
                    full_name:      customerDoc?.full_name || userDoc.username,
                    order_id:       orderId,
                    amount:         String(total_price),
                    transaction_id: transId
                }).catch(e => console.error('[MOMO IPN] Mail error:', e.message));
            }
        } catch (mailErr) { console.error('[MOMO IPN] Mail error:', mailErr.message); }

        console.log(`[MOMO IPN] ✅ Đơn hàng tạo thành công: orderId=${orderId}, transId=${transId}`);
        return orderId;

    } catch (err) {
        await dbSession.abortTransaction();
        throw err;
    } finally {
        dbSession.endSession();
    }
};


// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/payment/momo/init
// Frontend gửi cart data → tạo MomoPendingSession → trả payUrl
// KHÔNG tạo Order ở bước này
// requestType: 'captureWallet' (QR/ví MoMo) | 'payWithATM' (tài khoản ngân hàng)
// ═══════════════════════════════════════════════════════════════════════════════
exports.initMomoPayment = async (req, res) => {
    try {
        const { items, voucher_code, shipping_address, request_type } = req.body;

        if (!items?.length)           return res.status(400).json({ success: false, message: 'Đơn hàng phải có ít nhất 1 sản phẩm' });
        if (!shipping_address?.trim()) return res.status(400).json({ success: false, message: 'Vui lòng nhập địa chỉ giao hàng' });

        // Tính tổng tiền (không lock kho, chỉ kiểm tra nhanh)
        let previewTotal = 0;
        for (const item of items) {
            const variant = await ProductVariant.findById(item.variant_id).select('price stock_quantity sku');
            if (!variant) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
            if (variant.stock_quantity < item.quantity) {
                return res.status(400).json({ success: false, message: `Sản phẩm "${variant.sku}" không đủ số lượng (tồn: ${variant.stock_quantity})` });
            }
            previewTotal += variant.price * item.quantity;
        }

        // Preview voucher
        let discount = 0;
        if (voucher_code) {
            const voucher = await Voucher.findOne({
                code: voucher_code.toUpperCase(), is_active: true,
                expires_at: { $gt: new Date() }, starts_at: { $lte: new Date() },
                $expr: { $lt: ['$used_count', '$max_uses'] }
            });
            if (voucher && previewTotal >= voucher.min_order_value) {
                discount = voucher.discount_type === 'percent'
                    ? Math.min((previewTotal * voucher.discount_value) / 100, voucher.max_discount || Infinity)
                    : voucher.discount_value;
                discount = Math.min(Math.round(discount), previewTotal);
            }
        }

        const amount      = previewTotal - discount;
        const partnerCode = process.env.MOMO_PARTNER_CODE || 'MOMO';
        const accessKey   = process.env.MOMO_ACCESS_KEY;
        const requestId   = `${partnerCode}${Date.now()}`;
        const momoOrderId = `MOMO_${req.user._id}_${Date.now()}`;
        const orderInfo   = 'Thanh toan don hang';
        const redirectUrl = process.env.MOMO_REDIRECT_URL || 'http://localhost:3000/payment/result';
        const ipnUrl      = process.env.MOMO_IPN_URL      || 'http://localhost:5000/api/payment/momo/ipn';
        const extraData   = '';

        // payWithMethod hỗ trợ cả QR lẫn ATM trên sandbox MoMo
        // Frontend truyền request_type chỉ để phân biệt UI, backend luôn dùng payWithMethod
        const requestType = 'payWithMethod';

        const rawSignature = [
            `accessKey=${accessKey}`,
            `amount=${amount}`,
            `extraData=${extraData}`,
            `ipnUrl=${ipnUrl}`,
            `orderId=${momoOrderId}`,
            `orderInfo=${orderInfo}`,
            `partnerCode=${partnerCode}`,
            `redirectUrl=${redirectUrl}`,
            `requestId=${requestId}`,
            `requestType=${requestType}`,
        ].join('&');

        const momoRes = await sendMomoRequest({
            partnerCode, accessKey, requestId,
            amount: String(amount), orderId: momoOrderId, orderInfo,
            redirectUrl, ipnUrl, extraData,
            requestType, signature: createMomoSignature(rawSignature), lang: 'vi'
        });

        if (momoRes.resultCode !== 0) {
            console.error('[MOMO] init error:', momoRes);
            return res.status(400).json({ success: false, message: `MoMo từ chối: ${momoRes.message || 'Lỗi không xác định'}`, momo_code: momoRes.resultCode });
        }

        await MomoPendingSession.create({
            momo_order_id:   momoOrderId,
            user_id:         req.user._id,
            items,
            voucher_code:    voucher_code || null,
            shipping_address,
            status:          'pending',
            expires_at:      new Date(Date.now() + 30 * 60 * 1000)
        });

        console.log(`[MOMO] ✅ Session khởi tạo: ${momoOrderId}, amount=${amount}, type=${requestType}`);
        res.json({ success: true, pay_url: momoRes.payUrl, deep_link: momoRes.deeplink, qr_code_url: momoRes.qrCodeUrl, momo_order_id: momoOrderId, amount });

    } catch (err) {
        console.error('[MOMO] initPayment error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi kết nối cổng thanh toán MoMo' });
    }
};


// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/payment/momo/ipn
// MoMo gọi server-to-server → CHỈ tạo đơn hàng khi resultCode === 0
// ═══════════════════════════════════════════════════════════════════════════════
exports.momoIpn = async (req, res) => {
    try {
        const { partnerCode, orderId, requestId, amount, orderInfo, orderType, transId, resultCode, message, payType, responseTime, extraData, signature } = req.body;

        // 1. Xác minh chữ ký
        const rawSig = [`accessKey=${process.env.MOMO_ACCESS_KEY}`,`amount=${amount}`,`extraData=${extraData}`,`message=${message}`,`orderId=${orderId}`,`orderInfo=${orderInfo}`,`orderType=${orderType}`,`partnerCode=${partnerCode}`,`payType=${payType}`,`requestId=${requestId}`,`responseTime=${responseTime}`,`resultCode=${resultCode}`,`transId=${transId}`].join('&');
        if (signature !== createMomoSignature(rawSig)) {
            console.warn('[MOMO IPN] Chữ ký không hợp lệ!');
            return res.status(400).json({ success: false, message: 'Invalid signature' });
        }

        // 2. Tìm pending session — dùng orderId trực tiếp (momoOrderId = orderId)
        const momoOrderId = orderId;
        const pendingSession = await MomoPendingSession.findOne({ momo_order_id: momoOrderId });
        if (!pendingSession) {
            console.warn(`[MOMO IPN] Session không tìm thấy: ${momoOrderId}`);
            return res.status(200).json({ success: true }); // Không retry
        }

        // 3. Xử lý kết quả
        if (resultCode === 0) {
            // ── THÀNH CÔNG → Tạo đơn hàng thật ──────────────────────────────
            if (pendingSession.status === 'pending') {
                try {
                    await createOrderFromPendingSession(pendingSession, transId, amount, responseTime);
                } catch (err) {
                    console.error('[MOMO IPN] Tạo đơn thất bại:', err.message);
                    pendingSession.status = 'expired';
                    await pendingSession.save();
                }
            }
        } else {
            // ── THẤT BẠI / HỦY → Không tạo đơn, chỉ đánh dấu ───────────────
            console.log(`[MOMO IPN] ❌ Thất bại: ${momoOrderId}, code=${resultCode}`);
            if (pendingSession.status === 'pending') {
                pendingSession.status = 'cancelled';
                await pendingSession.save();
            }
        }

        res.status(200).json({ success: true, message: 'IPN received' });
    } catch (err) {
        console.error('[MOMO IPN] error:', err.message);
        res.status(500).json({ success: false });
    }
};


// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/payment/momo/return
// MoMo redirect về (client-side) → forward sang frontend
// ═══════════════════════════════════════════════════════════════════════════════
exports.momoReturn = async (req, res) => {
    try {
        const { orderId, resultCode, message, transId, amount } = req.query;
        // orderId chính là momoOrderId (không cần parse extraData nữa)
        const momoOrderId = orderId;
        const isSuccess   = Number(resultCode) === 0;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/payment/result?` + new URLSearchParams({
            success:       isSuccess ? '1' : '0',
            momo_order_id: momoOrderId || '',
            message:       message     || '',
            trans_id:      transId     || '',
            amount:        amount      || ''
        }).toString());
    } catch (err) {
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/result?success=0&message=error`);
    }
};


// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/payment/momo/session-status/:momo_order_id
// Frontend polling — trả về pending | paid | cancelled | expired + order_id
// ═══════════════════════════════════════════════════════════════════════════════
exports.checkSessionStatus = async (req, res) => {
    try {
        const session = await MomoPendingSession.findOne({ momo_order_id: req.params.momo_order_id });
        if (!session) return res.status(404).json({ success: false, message: 'Không tìm thấy phiên thanh toán' });
        if (session.user_id.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });

        res.json({ success: true, data: { status: session.status, order_id: session.order_id || null, is_paid: session.status === 'paid' } });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/payment/momo/verify-return
// Frontend gọi sau khi MoMo redirect về với success=1.
// Backend tự query MoMo API để xác minh rồi tạo đơn hàng — không cần IPN.
// Dùng làm fallback khi IPN không đến được (môi trường dev/localhost).
// ═══════════════════════════════════════════════════════════════════════════════
exports.verifyAndCreateOrder = async (req, res) => {
    try {
        const { momo_order_id, trans_id, amount } = req.body;
        if (!momo_order_id) return res.status(400).json({ success: false, message: 'Thiếu momo_order_id' });

        const session = await MomoPendingSession.findOne({ momo_order_id });
        if (!session) return res.status(404).json({ success: false, message: 'Không tìm thấy phiên thanh toán' });
        if (session.user_id.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Không có quyền' });

        // Nếu đã paid rồi (IPN đến trước) → trả về ngay
        if (session.status === 'paid') {
            return res.json({ success: true, data: { status: 'paid', order_id: session.order_id } });
        }

        // Nếu đã cancelled/expired → thất bại
        if (session.status !== 'pending') {
            return res.json({ success: false, data: { status: session.status } });
        }

        // Query MoMo để xác minh giao dịch
        const partnerCode = process.env.MOMO_PARTNER_CODE || 'MOMO';
        const accessKey   = process.env.MOMO_ACCESS_KEY;
        const requestId   = `VERIFY_${Date.now()}`;

        const rawSignature = [
            `accessKey=${accessKey}`,
            `orderId=${momo_order_id}`,
            `partnerCode=${partnerCode}`,
            `requestId=${requestId}`,
        ].join('&');

        const signature = createMomoSignature(rawSignature);

        // Gọi MoMo query endpoint
        const queryBody = { partnerCode, requestId, orderId: momo_order_id, signature, lang: 'vi' };
        const queryBodyStr = JSON.stringify(queryBody);

        const queryResult = await new Promise((resolve, reject) => {
            const queryEndpoint = new URL('https://test-payment.momo.vn/v2/gateway/api/query');
            const options = {
                hostname: queryEndpoint.hostname,
                port: 443,
                path: queryEndpoint.pathname,
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(queryBodyStr) }
            };
            const req2 = require('https').request(options, r => {
                let d = '';
                r.on('data', c => d += c);
                r.on('end', () => { try { resolve(JSON.parse(d)); } catch { reject(new Error('parse error')); } });
            });
            req2.on('error', reject);
            req2.write(queryBodyStr);
            req2.end();
        });

        console.log('[MOMO VERIFY] Query result:', queryResult.resultCode, queryResult.message);

        if (queryResult.resultCode === 0) {
            // Giao dịch thành công → tạo đơn hàng
            if (session.status === 'pending') {
                try {
                    const orderId = await createOrderFromPendingSession(
                        session,
                        queryResult.transId || trans_id,
                        queryResult.amount  || amount,
                        queryResult.responseTime || Date.now()
                    );
                    return res.json({ success: true, data: { status: 'paid', order_id: orderId } });
                } catch (err) {
                    console.error('[MOMO VERIFY] Tạo đơn thất bại:', err.message);
                    return res.status(500).json({ success: false, message: 'Thanh toán thành công nhưng tạo đơn lỗi: ' + err.message });
                }
            }
        } else {
            // MoMo xác nhận thất bại → cập nhật session
            session.status = 'cancelled';
            await session.save();
            return res.json({ success: false, data: { status: 'cancelled', momo_message: queryResult.message } });
        }

    } catch (err) {
        console.error('[MOMO VERIFY] error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi xác minh thanh toán' });
    }
};

// Giữ lại để không break code cũ (admin / order detail)
exports.checkPaymentStatus = async (req, res) => {
    try {
        const order = await Order.findById(req.params.order_id).select('status payments total_price');
        if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        const momoPaid = order.status === 'Completed' && order.payments.some(p => p.method === 'Momo' && p.transaction_id);
        res.json({ success: true, data: { order_id: order._id, status: order.status, payment_status: momoPaid ? 'paid' : order.status === 'Cancelled' ? 'cancelled' : 'pending', is_paid: momoPaid, total_price: order.total_price, payments: order.payments } });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};