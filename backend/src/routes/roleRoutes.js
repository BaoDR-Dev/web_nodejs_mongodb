const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { protect, restrictTo } = require('../middlewares/auth');

// KHÓA TOÀN BỘ FILE: Chỉ Admin mới có quyền truy cập vào các API về Role
router.use(protect);
router.use(restrictTo('Admin'));

// [GET] /api/roles - Xem danh sách tất cả các quyền (Admin, Manager, Staff...)
router.get('/', roleController.listRoles);

// [GET] /api/roles/:id - Xem chi tiết một quyền cụ thể
router.get('/:id', roleController.getRoleById);

// [POST] /api/roles - Tạo một quyền mới (Ví dụ: Thêm quyền 'Shipper')
router.post('/', roleController.createRole);

// [PUT] /api/roles/:id - Chỉnh sửa tên quyền hoặc mô tả
router.put('/:id', roleController.updateRole);

// [DELETE] /api/roles/:id - Xóa một quyền khỏi hệ thống
router.delete('/:id', roleController.deleteRole);

module.exports = router;