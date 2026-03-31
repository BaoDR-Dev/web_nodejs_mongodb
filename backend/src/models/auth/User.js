const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email:    { type: String, unique: true, sparse: true },

    role_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    staff_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },

    status: { type: String, enum: ['Active', 'Banned'], default: 'Active' },

    // ── OTP đăng ký — xác minh email trước khi kích hoạt tài khoản ────────────
    is_verified:      { type: Boolean, default: false },
    register_otp:     { type: String,  select: false },
    register_otp_exp: { type: Date,    select: false },

    // ── OTP reset mật khẩu ─────────────────────────────────────────────────────
    reset_otp:        { type: String,  select: false },
    reset_otp_exp:    { type: Date,    select: false },

    // ── Reset password token (giữ lại cách cũ, dùng song song) ────────────────
    reset_password_token:   { type: String, select: false },
    reset_password_expires: { type: Date,   select: false }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
