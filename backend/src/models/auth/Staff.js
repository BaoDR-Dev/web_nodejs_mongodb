const mongoose = require('mongoose');

const StaffSchema = new mongoose.Schema({
    user_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true, 
        unique: true 
    },
    full_name: { type: String, required: true },
    phone: { type: String },
    position: { 
        type: String, 
        enum: ['Admin', 'Thủ kho', 'Nhân viên bán hàng'], 
        default: 'Nhân viên bán hàng' 
    },
    salary: { type: Number, default: 0 },
    hire_date: { type: Date, default: Date.now },
    status: { type: String, enum: ['Đang làm việc', 'Đã nghỉ việc'], default: 'Đang làm việc' }
}, { timestamps: true });

module.exports = mongoose.model('Staff', StaffSchema);