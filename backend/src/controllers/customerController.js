const Customer = require('../models/Customer');
const User = require('../models/User');
const Order = require('../models/Order'); // Để lấy danh sách đơn hàng
const bcrypt = require('bcrypt');

// 1. LIST & SEARCH (Tìm kiếm theo: Tên, SĐT, Giới tính, Địa chỉ, Khoảng chi tiêu)
exports.listCustomers = async (req, res) => {
    try {
        const { name, phone, sex, address, minSpending, maxSpending } = req.query;
        let filter = {};

        // Tìm theo tên (không phân biệt hoa thường)
        if (name) filter.full_name = { $regex: name, $options: 'i' };
        
        // Tìm theo số điện thoại
        if (phone) filter.phone = { $regex: phone, $options: 'i' };
        
        // Lọc theo giới tính (Nam/Nữ)
        if (sex) filter.sex = sex;
        
        // Lọc theo địa chỉ
        if (address) filter.address = { $regex: address, $options: 'i' };

        // Lọc theo khoảng tổng chi tiêu (Ví dụ: từ 1tr đến 5tr)
        if (minSpending || maxSpending) {
            filter.total_spending = {};
            if (minSpending) filter.total_spending.$gte = Number(minSpending);
            if (maxSpending) filter.total_spending.$lte = Number(maxSpending);
        }

        const customers = await Customer.find(filter)
            .populate('user_id', 'username email status')
            .sort({ total_spending: -1 }); // Sắp xếp ai tiêu nhiều tiền nhất lên đầu

        res.status(200).json({ success: true, count: customers.length, data: customers });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 2. GET BY ID (Chi tiết 1 khách hàng)
exports.getCustomerById = async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id).populate('user_id', 'username email');
        if (!customer) return res.status(404).json({ success: false, message: "Không tìm thấy khách hàng" });
        res.status(200).json({ success: true, data: customer });
    } catch (err) {
        res.status(400).json({ success: false, error: "ID không hợp lệ" });
    }
};

// 3. GET CUSTOMER ORDERS (Lấy danh sách đơn hàng của khách này)
exports.getCustomerOrders = async (req, res) => {
    try {
        const customerId = req.params.id;
        
        // Tìm tất cả đơn hàng có customer_id này
        const orders = await Order.find({ customer_id: customerId })
            .sort({ createdAt: -1 }); // Đơn mới nhất lên đầu

        res.status(200).json({
            success: true,
            count: orders.length,
            data: orders
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// [POST] /api/customers - Tạo cả User và Customer
exports.createCustomer = async (req, res) => {
    try {
        const { full_name, phone, sex, address, username, email, password } = req.body;

        // 1. Kiểm tra đầu vào
        if (!full_name || !username || !password) {
            return res.status(400).json({ success: false, message: 'Thiếu trường bắt buộc: full_name, username hoặc password' });
        }

        // 2. Tìm Role "Customer" trong DB (BƯỚC QUAN TRỌNG NHẤT)
        // Lưu ý: Bạn phải đảm bảo trong bảng Role đã có record tên là 'Customer'
        const Role = require('../models/Role'); // Đảm bảo đã import model Role
        const customerRole = await Role.findOne({ role_name: 'Customer' });
        
        if (!customerRole) {
            return res.status(500).json({ 
                success: false, 
                message: 'Lỗi hệ thống: Chưa khởi tạo Role "Customer" trong cơ sở dữ liệu.' 
            });
        }

        // 3. Kiểm tra trùng username/email
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) return res.status(400).json({ success: false, message: 'Username hoặc email đã tồn tại' });

        // 4. Hash mật khẩu
        const hashed = await bcrypt.hash(password, 10);

        // 5. Tạo User (Đã thêm role_id)
        const user = new User({ 
        username, 
        password: hashed, 
        email, 
        role_id: customerRole._id, // Luôn là ID của Role Customer
        status: 'Active' // Mặc định cho khách mới là Active
    });
        await user.save();

        // 6. Tạo Customer liên kết tới User
        const customer = new Customer({ 
            full_name, 
            phone, 
            sex, 
            address, 
            user_id: user._id 
        });
        await customer.save();

        // 7. Cập nhật ngược lại user.customer_id
        user.customer_id = customer._id;
        await user.save();

        const result = await Customer.findById(customer._id).populate('user_id', 'username email');
        res.status(201).json({ success: true, data: result });

    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ success: false, message: 'Dữ liệu trùng lặp', details: err.keyValue });
        }
        res.status(500).json({ success: false, error: err.message });
    }
};

// 5. UPDATE (Khách hàng tự sửa thông tin cá nhân hoặc Staff sửa hộ)
exports.updateCustomer = async (req, res) => {
    try {
        // Chỉ cho phép sửa các trường cơ bản, KHÔNG cho sửa total_spending ở đây
        const { full_name, phone, sex, address } = req.body;
        const updateData = { full_name, phone, sex, address };

        const updated = await Customer.findByIdAndUpdate(
            req.params.id, 
            updateData, 
            { new: true, runValidators: true }
        ).populate('user_id', 'username email');

        if (!updated) return res.status(404).json({ success: false, message: "Không tìm thấy khách hàng" });

        res.status(200).json({ success: true, data: updated });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// 7. UPDATE SPENDING (Hàm mới: Chỉ dành cho Admin/Manager sửa điểm/chi tiêu)
exports.updateSpending = async (req, res) => {
    try {
        const { total_spending } = req.body;

        if (total_spending === undefined || total_spending < 0) {
            return res.status(400).json({ success: false, message: "Số tiền chi tiêu không hợp lệ" });
        }

        const updated = await Customer.findByIdAndUpdate(
            req.params.id,
            { total_spending: total_spending },
            { new: true }
        ).populate('user_id', 'username email');

        res.status(200).json({ 
            success: true, 
            message: "Cập nhật tổng chi tiêu thành công", 
            data: updated 
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// 6. DELETE (Xóa khách hàng và tài khoản liên quan)
exports.deleteCustomer = async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);
        if (!customer) return res.status(404).json({ success: false, message: "Không tìm thấy" });

        // Xóa tài khoản User trước
        await User.findByIdAndDelete(customer.user_id);
        // Xóa hồ sơ Customer
        await Customer.findByIdAndDelete(req.params.id);

        res.status(200).json({ success: true, message: "Đã xóa khách hàng và tài khoản liên quan" });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

