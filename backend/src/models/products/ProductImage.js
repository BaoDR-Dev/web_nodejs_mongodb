const mongoose = require('mongoose');
const ProductImageSchema = new mongoose.Schema({
    variant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant' },
    image_url: { type: String, required: true },
    is_primary: { type: Boolean, default: false }
});
module.exports = mongoose.model('P_Image', ProductImageSchema);