const mongoose = require('mongoose');

const StockMovementSchema = new mongoose.Schema({
    variant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
    location_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    movement_type: {
        type: String,
        enum: ['IN', 'OUT', 'TRANSFER', 'ADJUST'],
        required: true
    },
    quantity_change: { type: Number, required: true },
    quantity_before: { type: Number, required: true },
    quantity_after: { type: Number, required: true },
    reason: { type: String },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('StockMovement', StockMovementSchema);
