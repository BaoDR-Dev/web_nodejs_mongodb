const User = require('../../models/auth/User');
const Staff = require('../../models/auth/Staff');
const Role = require('../../models/auth/Role');
const Customer = require('../../models/customers/Customer');
const bcrypt = require('bcrypt');

// 1. LẤY THÔNG TIN CHI TIẾT (Tự động nhận diện Staff hay Customer)
exports.getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate('role_id', 'role_name');
        if (!user) return res.status(404).json({ success: false, message: "User không tồn tại" });

        let profile = null;
        // Kiểm tra xem User này là Staff hay Customer để lấy hồ sơ tương ứng
        if (user.staff_id) {
            profile = await Staff.findById(user.staff_id);
        } else if (user.customer_id) {
            profile = await Customer.findById(user.customer_id);
        }

        res.status(200).json({ success: true, user, profile });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 2. TÌM KIẾM NÂNG CAO (Theo Username, Email, Role)
exports.searchUsers = async (req, res) => {
    try {
        const { username, email, type } = req.query; // type: 'staff' hoặc 'customer'
        let filter = {};

        if (username) filter.username = { $regex: username, $options: 'i' };
        if (email) filter.email = { $regex: email, $options: 'i' };
        
        // Lọc theo loại tài khoản
        if (type) {
            if (type === 'staff') {
                filter.staff_id = { $exists: true };
            } else if (type === 'customer') {
                filter.customer_id = { $exists: true };
            } else {
                // Nếu truyền type mà không phải staff/customer thì bắt nó trả về rỗng
                filter._id = null; 
                // Hoặc trả về lỗi luôn: return res.status(400).json({ message: "Type không hợp lệ" });
            }
        }
        const users = await User.find(filter)
            .populate('role_id', 'role_name')
            .select('-password'); // Ẩn password khi tìm kiếm

        res.status(200).json({ success: true, count: users.length, data: users });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 3. ĐỔI MẬT KHẨU
exports.changePassword = async (req, res) => {
    try {
        const { newPassword } = req.body; // Postman gửi newPassword
        const targetUserId = req.params.id;
        const currentUser = req.user; // Người đang thực hiện (Admin hoặc Chính chủ)

        // 1. Kiểm tra độ dài mật khẩu (Sửa lỗi "Ít nhất 6 ký tự" bạn vừa gặp)
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: "Mật khẩu mới phải ít nhất 6 ký tự" });
        }

        const user = await User.findById(targetUserId);
        if (!user) return res.status(404).json({ message: "Người dùng không tồn tại" });

        // 2. Hash mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        
        await user.save();

        res.status(200).json({ 
            success: true, 
            message: `Đã cập nhật mật khẩu cho user ${user.username} thành công!` 
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 4. CHỈNH TRẠNG THÁI (Active/Banned/Inactive)
exports.updateStatus = async (req, res) => {
    try {
        const { status } = req.body; // 'Active', 'Banned', v.v.
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id, 
            { status }, 
            { new: true }
        ).select('username status');

        res.status(200).json({ success: true, data: updatedUser });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.updateUserRole = async (req, res) => {
    try {
        const { new_role_id } = req.body;
        const userId = req.params.id;

        // 1. Kiểm tra xem Role mới có tồn tại trong DB không
        const roleExists = await Role.findById(new_role_id);
        if (!roleExists) {
            return res.status(404).json({ success: false, message: "Mã quyền hạn (Role ID) không tồn tại" });
        }

        // 2. Cập nhật Role cho User
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { role_id: new_role_id },
            { new: true }
        ).populate('role_id', 'role_name');

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
        }

        res.status(200).json({ 
            success: true, 
            message: "Đã cập nhật quyền hạn mới thành công",
            data: {
                username: updatedUser.username,
                new_role: updatedUser.role_id.role_name
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ĐỔI USERNAME
exports.updateUsername = async (req, res) => {
    try {
        const { new_username } = req.body;
        const userId = req.params.id;

        // 1. Kiểm tra username mới có trống không
        if (!new_username) {
            return res.status(400).json({ success: false, message: "Username mới không được để trống" });
        }

        // 2. Kiểm tra xem username mới đã tồn tại chưa
        const isExist = await User.findOne({ username: new_username });
        if (isExist) {
            return res.status(400).json({ success: false, message: "Username này đã có người sử dụng" });
        }

        // 3. Cập nhật username
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { username: new_username },
            { new: true }
        ).select('username email status');

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
        }

        res.status(200).json({ 
            success: true, 
            message: "Đổi username thành công", 
            data: updatedUser 
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};