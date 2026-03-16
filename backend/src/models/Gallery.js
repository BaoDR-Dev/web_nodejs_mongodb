const mongoose = require('mongoose');
const GallerySchema = new mongoose.Schema({
    image_url: { type: String, required: true },
    category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    public_id: String // Dùng để xóa ảnh sau này
}, { timestamps: true });
module.exports = mongoose.model('Gallery', GallerySchema);