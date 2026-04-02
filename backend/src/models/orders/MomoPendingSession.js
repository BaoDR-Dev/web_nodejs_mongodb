const mongoose = require('mongoose');

/**
 * Lưu thông tin giỏ hàng tạm trước khi user thanh toán MoMo.
 * Đơn hàng thật chỉ được tạo sau khi IPN xác nhận resultCode === 0.
 * TTL: 30 phút — MoMo link thường hết hạn trong 15 phút.
 */
const MomoPendingSessionSchema = new mongoose.Schema({
    // ID do hệ thống sinh ra, truyền làm orderId cho MoMo (unique per attempt)
    momo_order_id: { type: String, required: true, unique: true, index: true },

    // User đang thanh toán
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Payload gốc từ frontend (dùng lại khi IPN về)
    items:            { type: Array,  required: true },   // [{ variant_id, quantity }]
    voucher_code:     { type: String, default: null },
    shipping_address: { type: String, required: true },

    // Trạng thái session
    status: {
        type: String,
        enum: ['pending', 'paid', 'cancelled', 'expired'],
        default: 'pending'
    },

    // order_id sau khi tạo thành công (điền bởi IPN handler)
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },

    // Tự xóa sau 30 phút nếu không có IPN
    expires_at: { type: Date, required: true, index: { expireAfterSeconds: 0 } }
}, { timestamps: true });

module.exports = mongoose.model('MomoPendingSession', MomoPendingSessionSchema);