const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
    images: [{ type: String }],
    is_visible: { type: Boolean, default: true }
}, { timestamps: true });

ReviewSchema.index({ product_id: 1, user_id: 1 }, { unique: true });

module.exports = mongoose.model('Review', ReviewSchema);
