const mongoose = require('mongoose'); // THÊM DÒNG NÀY

const WarehouseSchema = new mongoose.Schema({
    warehouse_name: { type: String, required: true, unique: true, trim: true },
    address: { type: String, required: true },
    capacity: { type: Number, default: 0 },
    manager_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' }
}, { 
    timestamps: true,
    toJSON: { virtuals: true }, // Cho phép hiển thị virtuals khi chuyển sang JSON
    toObject: { virtuals: true }
});

// Tạo trường ảo 'locations'
WarehouseSchema.virtual('locations', {
    ref: 'Location',
    localField: '_id',
    foreignField: 'warehouse_id'
});