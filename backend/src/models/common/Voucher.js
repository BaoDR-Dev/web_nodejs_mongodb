const mongoose = require('mongoose');

const VoucherSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String },
    discount_type: { type: String, enum: ['percent', 'fixed'], required: true },
    discount_value: { type: Number, required: true },
    max_discount: { type: Number },
    min_order_value: { type: Number, default: 0 },
    max_uses: { type: Number, default: 1 },
    used_count: { type: Number, default: 0 },
    used_by: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    is_active: { type: Boolean, default: true },
    starts_at: { type: Date, default: Date.now },
    expires_at: { type: Date, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Voucher', VoucherSchema);
