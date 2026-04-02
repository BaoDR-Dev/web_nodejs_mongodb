// Brand.js
const mongoose = require('mongoose');
const BrandSchema = new mongoose.Schema({
    brand_name: { type: String, required: true },
    description: String
});
module.exports = mongoose.model('Brand', BrandSchema);