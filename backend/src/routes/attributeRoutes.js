const express = require('express');
const router = express.Router();
const attrCtrl = require('../controllers/attributeController');
const { protect, restrictTo } = require('../middlewares/auth');

// ==========================================
// QUYỀN PUBLIC (Ai cũng có thể xem để chọn màu/size khi mua hàng)
// ==========================================

// Lấy danh sách thuộc tính (Ví dụ: /api/attributes/color hoặc /api/attributes/size)
router.get('/:attrType', attrCtrl.getAttributes);

// ==========================================
// QUYỀN ADMIN & MANAGER (Mới được Thêm/Sửa/Xóa)
// ==========================================
router.use(protect); // Yêu cầu đăng nhập cho các thao tác dưới đây
const adminManager = restrictTo('Admin', 'Manager');

// Thêm mới thuộc tính (POST: /api/attributes/color)
router.post('/:attrType', adminManager, attrCtrl.createAttribute);

// Cập nhật thuộc tính (PUT: /api/attributes/color/ID_CUA_MAU)
router.put('/:attrType/:id', adminManager, attrCtrl.updateAttribute);

// Xóa thuộc tính (DELETE: /api/attributes/size/ID_CUA_SIZE)
router.delete('/:attrType/:id', adminManager, attrCtrl.deleteAttribute);

module.exports = router;