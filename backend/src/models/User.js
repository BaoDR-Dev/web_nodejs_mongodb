const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }, 
    email: { type: String, unique: true },    
    
    // Quyền: Admin, Staff, hoặc Customer
    role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },

    // Nếu là Khách hàng thì điền vào đây
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },

    // Nếu là Nhân viên/Admin thì điền vào đây (Bổ sung cái này)
    staff_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },

    status: { type: String, enum: ['Active', 'Banned'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);