const mongoose = require('mongoose');
// Cuối file Review.js
const ReviewSchema = new mongoose.Schema({
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant' },
    user_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    order_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    rating:     { type: Number, required: true, min: 1, max: 5 },
    comment:    { type: String },
    images:     [{ type: String }],
    is_visible: { type: Boolean, default: true }
}, { timestamps: true });

// Mỗi user chỉ được đánh giá 1 lần mỗi variant trên 1 đơn hàng cụ thể
ReviewSchema.index({ variant_id: 1, user_id: 1, order_id: 1 }, { unique: true, sparse: true });

const Review = mongoose.model('Review', ReviewSchema);

// THÊM DÒNG NÀY: Ép MongoDB đồng bộ lại index, xóa index cũ gây lỗi 500
Review.syncIndexes().catch(err => console.log('Lỗi sync index Review:', err));

module.exports = Review;