const Shipment = require('../../models/orders/Shipment');
const Order = require('../../models/orders/Order');
const ReturnOrder = require('../../models/orders/ReturnOrder');
const { createNotification } = require('../common/notificationController');
const { sendShipmentCreatedEmail } = require('../../services/mailService');

// ─── 1. TẠO VẬN ĐƠN CHO ĐƠN HÀNG ────────────────────────────────────────────
exports.createShipment = async (req, res) => {
    try {
        const { order_id, carrier, tracking_code, shipping_fee, shipping_address, estimated_date, note } = req.body;
        if (!order_id) return res.status(400).json({ success: false, message: 'Thiếu order_id' });

        const order = await Order.findById(order_id)
            .populate('customer_id', 'full_name')
            .populate('user_id', 'email username');
        if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });

        const existing = await Shipment.findOne({ order_id });
        if (existing) return res.status(400).json({ success: false, message: 'Đơn hàng này đã có vận đơn' });

        const shipment = await Shipment.create({
            order_id, carrier, tracking_code,
            shipping_fee, shipping_address, estimated_date, note
        });

        // Cập nhật trạng thái đơn hàng → Đang vận chuyển
        await Order.findByIdAndUpdate(order_id, { status: 'Shipping' });

        // Gửi thông báo in-app
        if (order.user_id) {
            await createNotification({
                user_id: order.user_id._id || order.user_id,
                title: 'Đơn hàng đang được giao',
                message: `Đơn hàng của bạn đã được bàn giao cho ${carrier || 'đơn vị vận chuyển'}. Mã vận đơn: ${tracking_code || 'Đang cập nhật'}`,
                type: 'order',
                link: `/orders/${order_id}`
            });
        }

        // Gửi email thông báo kèm phí ship
        try {
            const email = order.user_id?.email;
            const fullName = order.customer_id?.full_name || order.user_id?.username || 'Khách hàng';
            if (email) {
                sendShipmentCreatedEmail({
                    to: email,
                    full_name: fullName,
                    order_id,
                    carrier,
                    tracking_code,
                    shipping_fee: shipping_fee || 0,
                    estimated_date
                }).catch(e => console.error('[MAIL] Shipment email lỗi:', e.message));
            }
        } catch (mailErr) {
            console.error('[MAIL] Shipment email error:', mailErr.message);
        }

        res.status(201).json({ success: true, data: shipment });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── 2. LẤY VẬN ĐƠN THEO ĐƠN HÀNG ───────────────────────────────────────────
exports.getShipmentByOrder = async (req, res) => {
    try {
        const shipment = await Shipment.findOne({ order_id: req.params.order_id })
            .populate({ path: 'order_id', populate: { path: 'customer_id', select: 'full_name phone' } });

        if (!shipment) return res.status(404).json({ success: false, message: 'Chưa có thông tin vận chuyển' });
        res.json({ success: true, data: shipment });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── 3. CẬP NHẬT TRẠNG THÁI VẬN CHUYỂN ──────────────────────────────────────
exports.updateShipmentStatus = async (req, res) => {
    try {
        const { status, tracking_code, note } = req.body;
        const validStatuses = ['Pending', 'Picking', 'In Transit', 'Delivered', 'Failed', 'Returned'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: `Trạng thái không hợp lệ. Chọn: ${validStatuses.join(', ')}` });
        }

        const shipment = await Shipment.findById(req.params.id).populate('order_id');
        if (!shipment) return res.status(404).json({ success: false, message: 'Không tìm thấy vận đơn' });

        shipment.status = status;
        if (tracking_code) shipment.tracking_code = tracking_code;
        if (note) shipment.note = note;
        if (status === 'Delivered') shipment.delivered_at = new Date();
        await shipment.save();

        const orderId = shipment.order_id._id || shipment.order_id;

        // ── Đồng bộ trạng thái đơn hàng theo vận đơn ────────────────────────
        if (status === 'Delivered') {
            // Giao thành công → đơn hàng Completed
            await Order.findByIdAndUpdate(orderId, { status: 'Completed' });

        } else if (status === 'Returned') {
            // Vận đơn trả về → đơn hàng Returned
            await Order.findByIdAndUpdate(orderId, { status: 'Returned' });

            // Tự động tạo ReturnOrder nếu chưa có
            const existingReturn = await ReturnOrder.findOne({ order_id: orderId });
            if (!existingReturn) {
                const order = await Order.findById(orderId).populate('customer_id');
                const returnItems = order.details.map(d => ({
                    variant_id: d.variant_id,
                    quantity: d.quantity,
                    reason: 'Vận chuyển hoàn trả'
                }));
                await ReturnOrder.create({
                    order_id: orderId,
                    customer_id: order.customer_id?._id || order.customer_id,
                    items: returnItems,
                    note: note || 'Tự động tạo khi vận đơn hoàn trả',
                    status: 'Pending'
                });
            }

        } else if (status === 'In Transit' || status === 'Picking') {
            // Đảm bảo đơn hàng ở trạng thái Shipping
            await Order.findByIdAndUpdate(orderId, { status: 'Shipping' });
        }

        // Gửi thông báo in-app
        const order = await Order.findById(orderId);
        if (order?.user_id) {
            const msgMap = {
                'Picking':    'Đơn hàng đang được lấy hàng.',
                'In Transit': 'Đơn hàng đang trên đường vận chuyển đến bạn.',
                'Delivered':  '🎉 Đơn hàng đã được giao thành công!',
                'Failed':     'Giao hàng thất bại. Vui lòng liên hệ cửa hàng.',
                'Returned':   'Đơn hàng đã được hoàn trả về cửa hàng.'
            };
            if (msgMap[status]) {
                await createNotification({
                    user_id: order.user_id,
                    title: 'Cập nhật đơn hàng',
                    message: msgMap[status],
                    type: 'order',
                    link: `/orders/${orderId}`
                });
            }
        }

        res.json({ success: true, data: shipment });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── 4. DANH SÁCH VẬN ĐƠN ────────────────────────────────────────────────────
exports.getAllShipments = async (req, res) => {
    try {
        const { status, carrier, page = 1, limit = 20 } = req.query;
        let filter = {};
        if (status) filter.status = status;
        if (carrier) filter.carrier = { $regex: carrier, $options: 'i' };

        const shipments = await Shipment.find(filter)
            .populate({ path: 'order_id', select: 'total_price status customer_id', populate: { path: 'customer_id', select: 'full_name phone' } })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Shipment.countDocuments(filter);
        res.json({ success: true, total, page: Number(page), data: shipments });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── 5. CẬP NHẬT THÔNG TIN VẬN ĐƠN ──────────────────────────────────────────
exports.updateShipment = async (req, res) => {
    try {
        const updated = await Shipment.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!updated) return res.status(404).json({ success: false, message: 'Không tìm thấy vận đơn' });
        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
