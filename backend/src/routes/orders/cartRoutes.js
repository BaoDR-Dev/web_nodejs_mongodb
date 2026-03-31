const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/orders/cartController');
const { protect } = require('../../middlewares/auth');

router.use(protect); // Tất cả route giỏ hàng cần đăng nhập

router.get('/',          ctrl.getCart);              // Lấy giỏ hàng (chỉ item active)
router.get('/count',     ctrl.getCartCount);         // Đếm số lượng
router.get('/selected',  ctrl.getSelectedItems);     // Lấy item đã chọn (checkout)
router.post('/add',      ctrl.addToCart);            // Thêm sản phẩm
router.post('/select-all', ctrl.selectAll);          // Chọn / bỏ chọn tất cả

router.put('/item/:item_id',        ctrl.updateCartItem);    // Cập nhật số lượng
router.patch('/item/:item_id/toggle', ctrl.toggleSelectItem); // Toggle chọn 1 item

router.delete('/item/:item_id',      ctrl.removeCartItem);     // Xóa mềm 1 item
router.delete('/item/:item_id/hard', ctrl.hardDeleteCartItem); // Xóa cứng 1 item
router.delete('/clear',              ctrl.clearCart);          // Xóa mềm tất cả

module.exports = router;