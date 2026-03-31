const express = require('express');
const router = express.Router();
const categoryController = require('../../controllers/products/categoryController');
const { protect, restrictTo } = require('../../middlewares/auth');

// --- NHÓM 1: CÔNG KHAI (Public) ---
// Cho phép khách hàng xem danh sách và chi tiết danh mục mà không cần đăng nhập
router.get('/', categoryController.getCategories);
router.get('/:id', categoryController.getCategoryById);

// --- NHÓM 2: CẦN ĐĂNG NHẬP (Private) ---
router.use(protect); // Tất cả các route bên dưới đều phải có Token

// Thêm danh mục mới: Nhân viên, Quản lý và Admin đều làm được
router.post('/', 
    restrictTo('Admin', 'Manager', 'Staff'), 
    categoryController.createCategory
);

// Sửa danh mục: Nhân viên, Quản lý và Admin
router.put('/:id', 
    restrictTo('Admin', 'Manager', 'Staff'), 
    categoryController.updateCategory
);

// Xóa danh mục: Chỉ Admin và Manager mới có quyền xóa 
// (Tránh trường hợp Staff xóa nhầm làm mất liên kết của hàng loạt sản phẩm)
router.delete('/:id', 
    restrictTo('Admin', 'Manager'), 
    categoryController.deleteCategory
);

module.exports = router;