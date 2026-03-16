const Role = require('../models/Role');

// [GET] /api/roles - LIST ALL
exports.listRoles = async (req, res) => {
    try {
        const roles = await Role.find().sort({ role_name: 1 });
        res.status(200).json({ success: true, count: roles.length, data: roles });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// [GET] /api/roles/:id - GET BY ID
exports.getRoleById = async (req, res) => {
    try {
        const role = await Role.findById(req.params.id);
        if (!role) return res.status(404).json({ success: false, message: "Không tìm thấy quyền này" });
        res.status(200).json({ success: true, data: role });
    } catch (err) {
        res.status(400).json({ success: false, error: "ID không hợp lệ" });
    }
};

// [POST] /api/roles - CREATE
exports.createRole = async (req, res) => {
    try {
        const { role_name } = req.body;
        // Kiểm tra xem role đã tồn tại chưa
        const existingRole = await Role.findOne({ role_name });
        if (existingRole) return res.status(400).json({ success: false, message: "Quyền này đã tồn tại" });

        const newRole = await Role.create({ role_name });
        res.status(201).json({ success: true, data: newRole });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// [PUT] /api/roles/:id - UPDATE
exports.updateRole = async (req, res) => {
    try {
        const updatedRole = await Role.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({ success: true, data: updatedRole });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// [DELETE] /api/roles/:id - DELETE
exports.deleteRole = async (req, res) => {
    try {
        const role = await Role.findById(req.params.id);
        
        // 1. Chống tự sát hệ thống
        if (role.role_name === 'Admin') {
            return res.status(403).json({ 
                success: false, 
                message: "Không thể xóa quyền Admin! Đây là quyền hệ thống cốt lõi." 
            });
        }

        // 2. Kiểm tra xem có User nào đang sử dụng Role này không
        const User = require('../models/User');
        const userInRole = await User.findOne({ role_id: req.params.id });
        if (userInRole) {
            return res.status(400).json({ 
                success: false, 
                message: "Không thể xóa Role này vì vẫn còn người dùng đang thuộc nhóm quyền này!" 
            });
        }

        await Role.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "Xóa Role thành công" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};