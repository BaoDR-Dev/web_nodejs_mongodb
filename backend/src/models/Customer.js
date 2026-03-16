const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
    full_name: { type: String, required: true },
    phone: { type: String, unique: true },
    sex: { type: String },
    address: { type: String },
    total_spending: { type: Number, default: 0 },
    // Liên kết ngược lại User để biết hồ sơ này của tài khoản nào
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } 
}, { timestamps: true });

module.exports = mongoose.model('Customer', CustomerSchema);