const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    order_type: { type: String, enum: ['IN', 'OUT'], required: true },

    // ── Đơn bán (OUT) ─────────────────────────────────────────────────────────
    user_id:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customer_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    voucher_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher' },
    discount_amount:  { type: Number, default: 0 },
    shipping_address: { type: String },

    // ── Đơn nhập (IN) ─────────────────────────────────────────────────────────
    supplier_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    supplier_note:   { type: String },  // Ghi chú / nội dung hoá đơn
    invoice_number:  { type: String },  // Số hoá đơn VAT

    // ── Chung ─────────────────────────────────────────────────────────────────
    warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
    status:       { type: String, enum: ['Draft', 'Completed', 'Cancelled', 'Shipping', 'Returned'], default: 'Draft' },
    total_price:  { type: Number, default: 0 },

    payments: [{
        method: {
            type: String,
            enum: ['Cash', 'Transfer', 'Card', 'COD', 'Momo'],
            required: true
        },
        amount:         { type: Number, required: true },
        payment_date:   { type: Date, default: Date.now },
        transaction_id: { type: String }
    }],

    details: [{
        variant_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant' },
        location_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
        quantity:    { type: Number, required: true },
        unit_price:  { type: Number, required: true }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);
