// Brand.js
const mongoose = require('mongoose');
const BrandSchema = new mongoose.Schema({
    name: { type: String, required: true },
    origin: String
});
module.exports = mongoose.model('Brand', BrandSchema);