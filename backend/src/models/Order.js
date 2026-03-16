const mongoose = require('mongoose');
const OrderSchema = new mongoose.Schema({
    order_type: { type: String, enum: ['IN', 'OUT'], required: true }, // Nhập/Xuất
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
    status: { type: String, enum: ['Draft', 'Completed', 'Cancelled'], default: 'Draft' },
    total_price: { type: Number, default: 0 },
    // Cập nhật mảng payments trong OrderSchema
    payments: [{
        method: { 
            type: String, 
            enum: ['Cash', 'Transfer', 'Card', 'COD', 'Momo'], // Thêm 'Momo' vào đây
            required: true 
        },
        amount: { type: Number, required: true },
        payment_date: { type: Date, default: Date.now },
        transaction_id: { type: String } // Thêm trường này để lưu mã giao dịch từ MoMo
    }],
    details: [{
        variant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant' },
        quantity: { type: Number, required: true },
        unit_price: { type: Number, required: true }
    }]
}, { timestamps: true });
module.exports = mongoose.model('Order', OrderSchema);