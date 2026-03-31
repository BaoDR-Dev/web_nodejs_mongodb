const Customer = require('../../models/customers/Customer');
const User     = require('../../models/auth/User');
const Order    = require('../../models/orders/Order');
const bcrypt   = require('bcrypt');
const { sendRegisterOtp, sendWelcomeEmail } = require('../../services/mailService');

// ─── Helper: tạo OTP 6 số ────────────────────────────────────────────────────
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const OTP_EXPIRE_MS = 5 * 60 * 1000; // 5 phút

// ─── 1. LIST & SEARCH ─────────────────────────────────────────────────────────
exports.listCustomers = async (req, res) => {
    try {
        const { name, phone, sex, address, minSpending, maxSpending } = req.query;
        let filter = {};
        if (name)    filter.full_name = { $regex: name, $options: 'i' };
        if (phone)   filter.phone     = { $regex: phone, $options: 'i' };
        if (sex)     filter.sex       = sex;
        if (address) filter.address   = { $regex: address, $options: 'i' };
        if (minSpending || maxSpending) {
            filter.total_spending = {};
            if (minSpending) filter.total_spending.$gte = Number(minSpending);
            if (maxSpending) filter.total_spending.$lte = Number(maxSpending);
        }
        const customers = await Customer.find(filter)
            .populate('user_id', 'username email status is_verified')
            .sort({ total_spending: -1 });
        res.json({ success: true, count: customers.length, data: customers });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── 2. GET BY ID ─────────────────────────────────────────────────────────────
exports.getCustomerById = async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id).populate('user_id', 'username email is_verified');
        if (!customer) return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
        res.json({ success: true, data: customer });
    } catch (err) {
        res.status(400).json({ success: false, error: 'ID không hợp lệ' });
    }
};

// ─── 3. GET CUSTOMER ORDERS ───────────────────────────────────────────────────
exports.getCustomerOrders = async (req, res) => {
    try {
        const orders = await Order.find({ customer_id: req.params.id, order_type: 'OUT' })
            .populate({ path: 'details.variant_id', populate: { path: 'product_id', select: 'name' } })
            .sort({ createdAt: -1 });
        res.json({ success: true, count: orders.length, data: orders });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── 4. BƯỚC 1 ĐĂNG KÝ: Nhận thông tin → lưu tạm → gửi OTP ─────────────────
// POST /api/customers/register
exports.createCustomer = async (req, res) => {
    try {
        const { full_name, phone, sex, address, username, email, password } = req.body;

        if (!full_name || !username || !password || !email) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu trường bắt buộc: full_name, username, email, password'
            });
        }

        const Role = require('../../models/auth/Role');
        const customerRole = await Role.findOne({ role_name: 'Customer' });
        if (!customerRole) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi hệ thống: Chưa khởi tạo Role "Customer" trong cơ sở dữ liệu.'
            });
        }

        // Kiểm tra trùng username / email
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            // Nếu user tồn tại nhưng chưa verify → cho phép gửi lại OTP
            if (!existingUser.is_verified && existingUser.email === email) {
                const otp = generateOtp();
                existingUser.register_otp     = otp;
                existingUser.register_otp_exp = new Date(Date.now() + OTP_EXPIRE_MS);
                await existingUser.save();
                await sendRegisterOtp({ to: email, full_name: existingUser.username, otp });
                return res.json({
                    success: true,
                    message: 'Tài khoản chưa xác minh. Đã gửi lại mã OTP mới về email.',
                    step: 'verify_otp',
                    email
                });
            }
            return res.status(400).json({ success: false, message: 'Username hoặc email đã tồn tại' });
        }

        // Tạo User với is_verified = false (chưa active)
        const hashed = await bcrypt.hash(password, 12);
        const otp    = generateOtp();

        const user = await User.create({
            username,
            password: hashed,
            email,
            role_id:          customerRole._id,
            is_verified:      false,
            register_otp:     otp,
            register_otp_exp: new Date(Date.now() + OTP_EXPIRE_MS)
        });

        // Tạo Customer profile ngay (linked với user chưa verify)
        const customer = await Customer.create({ full_name, phone, sex, address, user_id: user._id });
        await User.findByIdAndUpdate(user._id, { customer_id: customer._id });

        // Gửi OTP qua email
        await sendRegisterOtp({ to: email, full_name, otp });

        res.status(201).json({
            success: true,
            message: 'Đăng ký thành công! Vui lòng kiểm tra email và nhập mã OTP để kích hoạt tài khoản.',
            step: 'verify_otp',
            email
        });
    } catch (err) {
        console.error('[CUSTOMER] createCustomer error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── 5. BƯỚC 2 ĐĂNG KÝ: Xác minh OTP → kích hoạt tài khoản ─────────────────
// POST /api/customers/verify-otp
exports.verifyRegisterOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập email và mã OTP' });
        }

        // select: false nên phải explicitly select
        const user = await User.findOne({ email })
            .select('+register_otp +register_otp_exp');

        if (!user) {
            return res.status(404).json({ success: false, message: 'Email không tồn tại' });
        }
        if (user.is_verified) {
            return res.status(400).json({ success: false, message: 'Tài khoản đã được xác minh rồi' });
        }
        if (!user.register_otp || user.register_otp !== otp) {
            return res.status(400).json({ success: false, message: 'Mã OTP không đúng' });
        }
        if (new Date() > user.register_otp_exp) {
            return res.status(400).json({ success: false, message: 'Mã OTP đã hết hạn. Vui lòng đăng ký lại để nhận mã mới.' });
        }

        // Kích hoạt tài khoản
        user.is_verified      = true;
        user.register_otp     = undefined;
        user.register_otp_exp = undefined;
        await user.save();

        // Gửi email chào mừng
        const customer = await Customer.findOne({ user_id: user._id });
        sendWelcomeEmail({
            to: email,
            full_name: customer?.full_name || user.username,
            username: user.username
        }).catch(e => console.error('[MAIL] Welcome email lỗi:', e.message));

        res.json({
            success: true,
            message: 'Xác minh thành công! Tài khoản đã được kích hoạt. Bạn có thể đăng nhập ngay.'
        });
    } catch (err) {
        console.error('[CUSTOMER] verifyRegisterOtp error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── 6. GỬI LẠI OTP ĐĂNG KÝ ─────────────────────────────────────────────────
// POST /api/customers/resend-otp
exports.resendRegisterOtp = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'Vui lòng nhập email' });

        const user = await User.findOne({ email }).select('+register_otp_exp');
        if (!user) return res.status(404).json({ success: false, message: 'Email không tồn tại' });
        if (user.is_verified) return res.status(400).json({ success: false, message: 'Tài khoản đã được xác minh rồi' });

        // Rate limit: không cho gửi lại trong vòng 1 phút
        if (user.register_otp_exp && (user.register_otp_exp - Date.now()) > 4 * 60 * 1000) {
            return res.status(429).json({
                success: false,
                message: 'Vui lòng đợi ít nhất 1 phút trước khi gửi lại mã OTP'
            });
        }

        const otp = generateOtp();
        user.register_otp     = otp;
        user.register_otp_exp = new Date(Date.now() + OTP_EXPIRE_MS);
        await user.save();

        const customer = await Customer.findOne({ user_id: user._id });
        await sendRegisterOtp({ to: email, full_name: customer?.full_name || user.username, otp });

        res.json({ success: true, message: 'Đã gửi lại mã OTP về email.' });
    } catch (err) {
        console.error('[CUSTOMER] resendRegisterOtp error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── 7. UPDATE CUSTOMER ───────────────────────────────────────────────────────
exports.updateCustomer = async (req, res) => {
    try {
        const { full_name, phone, sex, address } = req.body;
        const updated = await Customer.findByIdAndUpdate(
            req.params.id,
            { full_name, phone, sex, address },
            { new: true, runValidators: true }
        );
        if (!updated) return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// ─── 8. DELETE CUSTOMER ───────────────────────────────────────────────────────
exports.deleteCustomer = async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);
        if (!customer) return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
        await User.findByIdAndDelete(customer.user_id);
        await customer.deleteOne();
        res.json({ success: true, message: 'Đã xóa khách hàng' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── 9. UPDATE SPENDING ───────────────────────────────────────────────────────
exports.updateSpending = async (req, res) => {
    try {
        const { total_spending } = req.body;
        const updated = await Customer.findByIdAndUpdate(
            req.params.id,
            { total_spending },
            { new: true }
        );
        if (!updated) return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
