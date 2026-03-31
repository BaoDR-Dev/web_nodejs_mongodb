const mongoose = require('mongoose');
const ProductSchema = new mongoose.Schema({
    sku: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    brand_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
    unit: { type: String, default: 'Cái' },
    description: String
}, { timestamps: true });
module.exports = mongoose.model('Product', ProductSchema);