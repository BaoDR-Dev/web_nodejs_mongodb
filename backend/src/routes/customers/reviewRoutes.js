const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/customers/reviewController');
const { protect, restrictTo } = require('../../middlewares/auth');

// Public: xem đánh giá sản phẩm
router.get('/product/:product_id', ctrl.getProductReviews);

// Cần đăng nhập
router.use(protect);
router.post('/', ctrl.createReview);                    // Viết đánh giá
router.put('/:id', ctrl.updateReview);                  // Sửa đánh giá
router.delete('/:id', ctrl.deleteReview);               // Xóa đánh giá

// Admin quản lý
router.get('/', restrictTo('Admin', 'Manager'), ctrl.getAllReviews);           // Tất cả review
router.patch('/:id/toggle', restrictTo('Admin'), ctrl.toggleVisibility);      // Ẩn/hiện

module.exports = router;
