const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [{
        variant_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
        quantity:    { type: Number, required: true, min: 1, default: 1 },
        is_selected: { type: Boolean, default: true },   // chọn để thanh toán
        is_deleted:  { type: Boolean, default: false }   // xóa mềm
    }]
}, { timestamps: true });

module.exports = mongoose.model('Cart', CartSchema);