const mongoose = require('mongoose');

const SupplierSchema = new mongoose.Schema({
    name:           { type: String, required: true, trim: true },
    phone:          { type: String, trim: true },
    email:          { type: String, trim: true, lowercase: true },
    address:        { type: String },
    contact_person: { type: String },    // Tên người liên hệ
    tax_code:       { type: String },    // Mã số thuế
    note:           { type: String },
    is_active:      { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Supplier', SupplierSchema);
