
const mongoose = require('mongoose');
const InventorySchema = new mongoose.Schema({
    variant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant' },
    location_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
    quantity: { type: Number, default: 0 }
});
module.exports = mongoose.model('Inventory', InventorySchema);