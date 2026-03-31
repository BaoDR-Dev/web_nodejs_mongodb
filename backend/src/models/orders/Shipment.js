const mongoose = require('mongoose');

const ShipmentSchema = new mongoose.Schema({
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    carrier: { type: String },
    tracking_code: { type: String },
    status: {
        type: String,
        enum: ['Pending', 'Picking', 'In Transit', 'Delivered', 'Failed', 'Returned'],
        default: 'Pending'
    },
    shipping_fee: { type: Number, default: 0 },
    shipping_address: {
        full_name: { type: String },
        phone: { type: String },
        address: { type: String },
        ward: { type: String },
        district: { type: String },
        province: { type: String }
    },
    estimated_date: { type: Date },
    delivered_at: { type: Date },
    note: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Shipment', ShipmentSchema);
