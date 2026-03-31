const mongoose = require('mongoose');

const ReturnOrderSchema = new mongoose.Schema({
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    handled_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    items: [{
        variant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant' },
        quantity: { type: Number, required: true },
        reason: { type: String }
    }],
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected', 'Completed'],
        default: 'Pending'
    },
    refund_method: { type: String, enum: ['Cash', 'Transfer', 'Momo', 'Store Credit'] },
    refund_amount: { type: Number, default: 0 },
    note: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('ReturnOrder', ReturnOrderSchema);
