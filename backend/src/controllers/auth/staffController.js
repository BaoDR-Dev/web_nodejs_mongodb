const Staff = require('../../models/auth/Staff');
const User = require('../../models/auth/User');
const Role = require('../../models/auth/Role');
const bcrypt = require('bcrypt');

// 1. TẠO NHÂN VIÊN (Tạo đồng thời User + Staff)
exports.createStaff = async (req, res) => {
    try {
        const { username, password, email, full_name, phone, position, salary, role_id } = req.body;

        // Kiểm tra các trường bắt buộc
        if (!username || !password || !full_name || !role_id) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin: username, password, full_name hoặc role_id" });
        }

        // Kiểm tra tài khoản đã tồn tại chưa
        const userExists = await User.findOne({ username });
        if (userExists) return res.status(400).json({ success: false, message: "Tên đăng nhập này đã có người sử dụng" });

        // Mã hóa mật khẩu
        const hashedPassword = await bcrypt.hash(password, 10);

        // BƯỚC 1: Tạo User (với role_id được truyền từ Postman/Frontend)
        const newUser = new User({
            username,
            password: hashedPassword,
            email,
            role_id,
            is_verified: true  // Nhân viên do admin tạo, không cần xác thực OTP
        });
        await newUser.save();

        // BƯỚC 2: Tạo hồ sơ nhân viên liên kết với User
        const newStaff = new Staff({
            user_id: newUser._id,
            full_name,
            phone,
            position,
            salary
        });
        await newStaff.save();

        // BƯỚC 3: Cập nhật ngược lại staff_id vào User
        newUser.staff_id = newStaff._id;
        await newUser.save();

        res.status(201).json({ success: true, data: newStaff });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 2. TÌM KIẾM & LIỆT KÊ (Tìm theo tên, chức vụ, mức lương, sđt)
exports.listStaff = async (req, res) => {
    try {
        const { name, position, phone, minSalary, maxSalary, status } = req.query;
        let filter = {};

        if (name) filter.full_name = { $regex: name, $options: 'i' };
        if (position) filter.position = position; // Thủ kho, Bán hàng...
        if (phone) filter.phone = { $regex: phone, $options: 'i' };
        if (status) filter.status = status;

        // Lọc theo khoảng lương
        if (minSalary || maxSalary) {
            filter.salary = {};
            if (minSalary) filter.salary.$gte = Number(minSalary);
            if (maxSalary) filter.salary.$lte = Number(maxSalary);
        }

        const staffs = await Staff.find(filter)
            .populate('user_id', 'username email role_id status')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, count: staffs.length, data: staffs });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 3. CẬP NHẬT THÔNG TIN NHÂN VIÊN
exports.updateStaff = async (req, res) => {
    try {
        const currentUserRole = req.user.role_name;
        let updateData = { ...req.body };

        // Nếu KHÔNG PHẢI Admin/Manager, thì chặn không cho sửa các trường nhạy cảm
        if (currentUserRole !== 'Admin' && currentUserRole !== 'Manager') {
            delete updateData.salary;
            delete updateData.position;
            delete updateData.role_id;
            delete updateData.status;
        }

        const updated = await Staff.findByIdAndUpdate(
            req.params.id, 
            updateData, 
            { new: true }
        ).populate('user_id', 'username email');

        res.status(200).json({ success: true, data: updated });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// 4. XÓA NHÂN VIÊN (Xóa cả tài khoản User)
exports.deleteStaff = async (req, res) => {
    try {
        const staff = await Staff.findById(req.params.id);
        if (!staff) return res.status(404).json({ success: false, message: "Không tìm thấy nhân viên" });

        await User.findByIdAndDelete(staff.user_id); // Xóa tài khoản trước
        await Staff.findByIdAndDelete(req.params.id); // Xóa hồ sơ sau

        res.status(200).json({ success: true, message: "Đã xóa nhân viên và tài khoản liên quan" });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// 4b. NGHỈ VIỆC — đánh dấu nghỉ việc + khóa tài khoản (không xóa dữ liệu)
exports.resignStaff = async (req, res) => {
    try {
        const staff = await Staff.findById(req.params.id);
        if (!staff) return res.status(404).json({ success: false, message: "Không tìm thấy nhân viên" });

        staff.status = 'Đã nghỉ việc';
        await staff.save();

        if (staff.user_id) {
            await User.findByIdAndUpdate(staff.user_id, { status: 'Banned' });
        }

        res.status(200).json({ success: true, message: "Nhân viên đã nghỉ việc và tài khoản đã bị khóa" });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// 5. LẤY CHI TIẾT 1 NHÂN VIÊN (Bổ sung để không bị lỗi Route)
exports.getStaffById = async (req, res) => {
    try {
        const staff = await Staff.findById(req.params.id)
            .populate('user_id', 'username email status');
            
        if (!staff) {
            return res.status(404).json({ success: false, message: "Không tìm thấy nhân viên" });
        }
        
        res.status(200).json({ success: true, data: staff });
    } catch (err) {
        res.status(400).json({ success: false, error: "ID không hợp lệ hoặc lỗi hệ thống" });
    }
};