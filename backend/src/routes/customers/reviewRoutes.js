const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/customers/reviewController');
const { protect, restrictTo } = require('../../middlewares/auth');

// Public: xem đánh giá sản phẩm
router.get('/product/:product_id', ctrl.getProductReviews);

// Cần đăng nhập
router.use(protect);
router.post('/',                      ctrl.createReview);        // Viết đánh giá
router.put('/:id',                    ctrl.updateReview);        // Sửa đánh giá
router.delete('/:id',                 ctrl.deleteReview);        // Xóa đánh giá
router.get('/order/:order_id',        ctrl.getReviewsByOrder);   // Review của tôi theo đơn hàng

// Admin quản lý
router.get('/', restrictTo('Admin', 'Manager'), ctrl.getAllReviews);
router.patch('/:id/toggle', restrictTo('Admin'), ctrl.toggleVisibility);

module.exports = router;
