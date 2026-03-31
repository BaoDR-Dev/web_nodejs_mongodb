const mongoose = require('mongoose');
const CategorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null }
});
module.exports = mongoose.model('Category', CategorySchema);