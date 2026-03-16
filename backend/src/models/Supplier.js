const mongoose = require('mongoose');
const SupplierSchema = new mongoose.Schema({
    name: { type: String, required: true },
    contact_info: String
});
module.exports = mongoose.model('Supplier', SupplierSchema);