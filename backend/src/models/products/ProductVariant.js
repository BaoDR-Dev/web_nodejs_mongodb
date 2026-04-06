const mongoose = require('mongoose');
const ProductVariantSchema = new mongoose.Schema({
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String, unique: true, required: true },
    color_id: { type: mongoose.Schema.Types.ObjectId, ref: 'P_Color' },
    size_id: { type: mongoose.Schema.Types.ObjectId, ref: 'P_Size' },
    type_id: { type: mongoose.Schema.Types.ObjectId, ref: 'P_Type' },
    price: { type: Number, required: true },
    stock_quantity: { type: Number, default: 0 }, // Tổng tồn thực tế
    is_active: { type: Boolean, default: true }
}, { timestamps: true });
module.exports = mongoose.model('ProductVariant', ProductVariantSchema);