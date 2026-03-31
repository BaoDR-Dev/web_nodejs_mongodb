const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/common/notificationController');
const { protect, restrictTo } = require('../../middlewares/auth');

router.use(protect); // Tất cả đều cần đăng nhập

router.get('/', ctrl.getMyNotifications);               // Lấy thông báo của mình
router.put('/read-all', ctrl.markAllAsRead);             // Đọc tất cả
router.delete('/clear-read', ctrl.deleteAllRead);        // Xóa đã đọc
router.put('/:id/read', ctrl.markAsRead);                // Đọc 1 cái
router.delete('/:id', ctrl.deleteNotification);          // Xóa 1 cái

// Admin gửi thông báo
router.post('/send', restrictTo('Admin', 'Manager'), ctrl.sendToUser);
router.post('/broadcast', restrictTo('Admin'), ctrl.broadcast);

module.exports = router;
