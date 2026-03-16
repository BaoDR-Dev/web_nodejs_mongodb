const mongoose = require('mongoose'); // THÊM DÒNG NÀY

const LocationSchema = new mongoose.Schema({
    warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    location_name: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ['Active', 'Full', 'Maintenance'], default: 'Active' }
}, { timestamps: true });

// Ràng buộc: Tên kệ là duy nhất TRONG CÙNG MỘT KHO
LocationSchema.index({ warehouse_id: 1, location_name: 1 }, { unique: true });

module.exports = mongoose.model('Location', LocationSchema);