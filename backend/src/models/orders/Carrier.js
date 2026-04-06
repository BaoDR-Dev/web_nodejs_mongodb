const mongoose = require('mongoose');

const CarrierSchema = new mongoose.Schema({
    name:       { type: String, required: true, unique: true },
    code:       { type: String, required: true, unique: true }, // VD: GHN, GHTK, VNPOST
    phone:      { type: String },
    website:    { type: String },
    is_active:  { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Carrier', CarrierSchema);
