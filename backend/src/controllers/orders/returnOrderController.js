const ReturnOrder = require('../../models/orders/ReturnOrder');
const Order = require('../../models/orders/Order');
const Shipment = require('../../models/orders/Shipment');
const ProductVariant = require('../../models/products/ProductVariant');
const Inventory = require('../../models/warehouse/Inventory');
const StockMovement = require('../../models/warehouse/StockMovement');
const { createNotification } = require('../common/notificationController');
const mongoose = require('mongoose');

// ─── 1. TẠO YÊU CẦU ĐỔI TRẢ ─────────────────────────────────────────────────
exports.createReturn = async (req, res) => {
    try {
        const { order_id, items, note } = req.body;
        if (!order_id || !items?.length) {
            return res.status(400).json({ success: false, message: 'Thiếu order_id hoặc danh sách sản phẩm trả' });
        }

        // Kiểm tra đơn hàng
        const order = await Order.findById(order_id).populate('customer_id');
        if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        if (order.status !== 'Completed') {
            return res.status(400).json({ success: false, message: 'Chỉ đơn hàng đã hoàn tất mới được đổi trả' });
        }

        // Kiểm tra trùng yêu cầu
        const existing = await ReturnOrder.findOne({ order_id, status: { $in: ['Pending', 'Approved'] } });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Đơn hàng này đã có yêu cầu đổi trả đang xử lý' });
        }

        const returnOrder = await ReturnOrder.create({
            order_id,
            customer_id: order.customer_id?._id,
            items,
            note
        });

        // Thông báo cho Admin/Manager
        res.status(201).json({ success: true, message: 'Yêu cầu đổi trả đã được ghi nhận', data: returnOrder });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── 2. DANH SÁCH YÊU CẦU ĐỔI TRẢ ───────────────────────────────────────────
exports.getAllReturns = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        let filter = {};
        if (status) filter.status = status;

        const returns = await ReturnOrder.find(filter)
            .populate('order_id', 'total_price createdAt')
            .populate('customer_id', 'full_name phone')
            .populate('handled_by', 'username')
            .populate('items.variant_id', 'sku price')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await ReturnOrder.countDocuments(filter);
        res.json({ success: true, total, page: Number(page), data: returns });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── 3. CHI TIẾT 1 YÊU CẦU ĐỔI TRẢ ──────────────────────────────────────────
exports.getReturnById = async (req, res) => {
    try {
        const returnOrder = await ReturnOrder.findById(req.params.id)
            .populate('order_id')
            .populate('customer_id', 'full_name phone address')
            .populate('handled_by', 'username')
            .populate({ path: 'items.variant_id', populate: { path: 'product_id', select: 'name' } });

        if (!returnOrder) return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu đổi trả' });
        res.json({ success: true, data: returnOrder });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── 4. DUYỆT YÊU CẦU ĐỔI TRẢ (Approved/Rejected) ───────────────────────────
exports.processReturn = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { status, refund_method, refund_amount, note } = req.body;
        if (!['Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Trạng thái phải là Approved hoặc Rejected' });
        }

        const returnOrder = await ReturnOrder.findById(req.params.id).populate('order_id');
        if (!returnOrder) return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu đổi trả' });
        if (returnOrder.status !== 'Pending') {
            return res.status(400).json({ success: false, message: 'Yêu cầu này đã được xử lý' });
        }

        returnOrder.status = status;
        returnOrder.handled_by = req.user._id;
        if (refund_method) returnOrder.refund_method = refund_method;
        if (refund_amount !== undefined) returnOrder.refund_amount = refund_amount;
        if (note) returnOrder.note = note;
        await returnOrder.save({ session });

        const orderId = returnOrder.order_id._id || returnOrder.order_id;

        // Nếu duyệt: nhập lại hàng vào kho + cập nhật đơn hàng & vận đơn
        if (status === 'Approved') {
            for (const item of returnOrder.items) {
                const variant = await ProductVariant.findById(item.variant_id).session(session);
                if (variant) {
                    const qBefore = variant.stock_quantity;
                    variant.stock_quantity += item.quantity;
                    await variant.save({ session });

                    await StockMovement.create([{
                        variant_id: item.variant_id,
                        movement_type: 'IN',
                        quantity_change: item.quantity,
                        quantity_before: qBefore,
                        quantity_after: qBefore + item.quantity,
                        reason: `Xác nhận trả hàng - đơn #${orderId}`,
                        created_by: req.user._id
                    }], { session });
                }
            }

            // Cập nhật đơn hàng → Đã trả hàng
            await Order.findByIdAndUpdate(orderId, { status: 'Returned' }, { session });

            // Cập nhật vận đơn → Returned (nếu có)
            await Shipment.findOneAndUpdate(
                { order_id: orderId },
                { status: 'Returned', note: note || 'Xác nhận trả hàng' },
                { session }
            );
        }

        await session.commitTransaction();

        // Gửi thông báo cho khách
        const order = await Order.findById(returnOrder.order_id);
        if (order?.user_id) {
            await createNotification({
                user_id: order.user_id,
                title: status === 'Approved' ? 'Yêu cầu đổi trả được duyệt' : 'Yêu cầu đổi trả bị từ chối',
                message: status === 'Approved'
                    ? `Yêu cầu đổi trả của bạn đã được chấp nhận. Hoàn tiền: ${(refund_amount || 0).toLocaleString('vi-VN')}₫`
                    : `Yêu cầu đổi trả bị từ chối. Lý do: ${note || 'Không đủ điều kiện'}`,
                type: 'return',
                link: `/returns/${returnOrder._id}`
            });
        }

        res.json({ success: true, message: `Đã ${status === 'Approved' ? 'duyệt' : 'từ chối'} yêu cầu đổi trả`, data: returnOrder });
    } catch (err) {
        await session.abortTransaction();
        res.status(500).json({ success: false, error: err.message });
    } finally {
        session.endSession();
    }
};

// ─── 5. HOÀN TẤT ĐỔI TRẢ (Completed) ────────────────────────────────────────
exports.completeReturn = async (req, res) => {
    try {
        const returnOrder = await ReturnOrder.findById(req.params.id);
        if (!returnOrder) return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu' });
        if (returnOrder.status !== 'Approved') {
            return res.status(400).json({ success: false, message: 'Chỉ đổi trả đã được duyệt mới hoàn tất được' });
        }

        returnOrder.status = 'Completed';
        returnOrder.handled_by = req.user._id;
        await returnOrder.save();

        res.json({ success: true, message: 'Đổi trả đã hoàn tất', data: returnOrder });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── 6. LỊCH SỬ ĐỔI TRẢ CỦA KHÁCH HÀNG ──────────────────────────────────────
exports.getReturnsByCustomer = async (req, res) => {
    try {
        const returns = await ReturnOrder.find({ customer_id: req.params.customer_id })
            .populate('order_id', 'total_price createdAt')
            .populate('items.variant_id', 'sku price')
            .sort({ createdAt: -1 });

        res.json({ success: true, count: returns.length, data: returns });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};