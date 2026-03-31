const Notification = require('../../models/common/Notification');

// Helper: tạo thông báo nội bộ (dùng cho các controller khác gọi)
exports.createNotification = async ({ user_id, title, message, type = 'system', link }) => {
    try {
        await Notification.create({ user_id, title, message, type, link });
    } catch (err) {
        console.error('Lỗi tạo thông báo:', err.message);
    }
};

// ─── 1. LẤY THÔNG BÁO CỦA USER ĐANG ĐĂNG NHẬP ───────────────────────────────
exports.getMyNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 20, is_read } = req.query;
        let filter = { user_id: req.user._id };
        if (is_read !== undefined) filter.is_read = is_read === 'true';

        const notifications = await Notification.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Notification.countDocuments(filter);
        const unread = await Notification.countDocuments({ user_id: req.user._id, is_read: false });

        res.json({ success: true, unread, total, page: Number(page), data: notifications });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── 2. ĐỌC 1 THÔNG BÁO ──────────────────────────────────────────────────────
exports.markAsRead = async (req, res) => {
    try {
        const notif = await Notification.findOneAndUpdate(
            { _id: req.params.id, user_id: req.user._id },
            { is_read: true },
            { new: true }
        );
        if (!notif) return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
        res.json({ success: true, data: notif });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── 3. ĐỌC TẤT CẢ THÔNG BÁO ────────────────────────────────────────────────
exports.markAllAsRead = async (req, res) => {
    try {
        const result = await Notification.updateMany(
            { user_id: req.user._id, is_read: false },
            { is_read: true }
        );
        res.json({ success: true, message: `Đã đánh dấu ${result.modifiedCount} thông báo là đã đọc` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── 4. XÓA 1 THÔNG BÁO ──────────────────────────────────────────────────────
exports.deleteNotification = async (req, res) => {
    try {
        const notif = await Notification.findOneAndDelete({ _id: req.params.id, user_id: req.user._id });
        if (!notif) return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
        res.json({ success: true, message: 'Đã xóa thông báo' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── 5. XÓA TẤT CẢ ĐÃ ĐỌC ───────────────────────────────────────────────────
exports.deleteAllRead = async (req, res) => {
    try {
        const result = await Notification.deleteMany({ user_id: req.user._id, is_read: true });
        res.json({ success: true, message: `Đã xóa ${result.deletedCount} thông báo đã đọc` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── 6. ADMIN GỬI THÔNG BÁO CHO USER CỤ THỂ ─────────────────────────────────
exports.sendToUser = async (req, res) => {
    try {
        const { user_id, title, message, type, link } = req.body;
        if (!user_id || !title || !message) {
            return res.status(400).json({ success: false, message: 'Thiếu user_id, title hoặc message' });
        }

        const notif = await Notification.create({ user_id, title, message, type, link });
        res.status(201).json({ success: true, data: notif });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── 7. ADMIN GỬI THÔNG BÁO HÀNG LOẠT ───────────────────────────────────────
exports.broadcast = async (req, res) => {
    try {
        const { user_ids, title, message, type = 'system', link } = req.body;
        if (!user_ids?.length || !title || !message) {
            return res.status(400).json({ success: false, message: 'Thiếu user_ids, title hoặc message' });
        }

        const notifications = user_ids.map(user_id => ({ user_id, title, message, type, link }));
        await Notification.insertMany(notifications);

        res.status(201).json({ success: true, message: `Đã gửi thông báo tới ${user_ids.length} người dùng` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};