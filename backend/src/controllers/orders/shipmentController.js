const Shipment = require('../../models/orders/Shipment');
const Order = require('../../models/orders/Order');
const { createNotification } = require('../common/notificationController');

// ─── 1. TẠO VẬN ĐƠN CHO ĐƠN HÀNG ────────────────────────────────────────────
exports.createShipment = async (req, res) => {
    try {
        const { order_id, carrier, tracking_code, shipping_fee, shipping_address, estimated_date, note } = req.body;
        if (!order_id) return res.status(400).json({ success: false, message: 'Thiếu order_id' });

        const order = await Order.findById(order_id).populate('customer_id');
        if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });

        // Kiểm tra đơn hàng đã có vận đơn chưa
        const existing = await Shipment.findOne({ order_id });
        if (existing) return res.status(400).json({ success: false, message: 'Đơn hàng này đã có vận đơn' });

        const shipment = await Shipment.create({
            order_id, carrier, tracking_code,
            shipping_fee, shipping_address, estimated_date, note
        });

        // Gửi thông báo cho khách hàng
        if (order.user_id) {
            await createNotification({
                user_id: order.user_id,
                title: 'Đơn hàng đang được giao',
                message: `Đơn hàng của bạn đã được bàn giao cho ${carrier || 'đơn vị vận chuyển'}. Mã vận đơn: ${tracking_code || 'Đang cập nhật'}`,
                type: 'order',
                link: `/orders/${order_id}`
            });
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

        // Cập nhật trạng thái đơn hàng nếu đã giao thành công
        if (status === 'Delivered') {
            await Order.findByIdAndUpdate(shipment.order_id._id, { status: 'Completed' });
        }

        // Gửi thông báo cho user
        const order = await Order.findById(shipment.order_id);
        if (order?.user_id) {
            const msgMap = {
                'Picking': 'Đơn hàng đang được lấy hàng.',
                'In Transit': 'Đơn hàng đang trên đường vận chuyển đến bạn.',
                'Delivered': '🎉 Đơn hàng đã được giao thành công!',
                'Failed': 'Giao hàng thất bại. Vui lòng liên hệ cửa hàng.',
                'Returned': 'Đơn hàng đã được hoàn trả.'
            };
            if (msgMap[status]) {
                await createNotification({
                    user_id: order.user_id,
                    title: `Cập nhật đơn hàng`,
                    message: msgMap[status],
                    type: 'order',
                    link: `/orders/${order._id}`
                });
            }
        }

        res.json({ success: true, data: shipment });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── 4. DANH SÁCH VẬN ĐƠN (Admin/Staff) ──────────────────────────────────────
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