const Review = require('../../models/customers/Review');
const Order = require('../../models/orders/Order');
const Product = require('../../models/products/Product');
const mongoose = require('mongoose');

// ─── 1. TẠO ĐÁNH GIÁ ─────────────────────────────────────────────────────────
exports.createReview = async (req, res) => {
    try {
        const { product_id, variant_id, order_id, rating, comment, images } = req.body;

        if (!product_id || !rating) {
            return res.status(400).json({ success: false, message: 'Thiếu product_id hoặc rating' });
        }

        const product = await Product.findById(product_id);
        if (!product) return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });

        if (order_id) {
            const order = await Order.findOne({
                _id: order_id,
                user_id: req.user._id,
                status: 'Completed',
                order_type: 'OUT'
            });
            if (!order) {
                return res.status(403).json({ success: false, message: 'Đơn hàng không hợp lệ hoặc chưa hoàn thành' });
            }
        }

        const existing = await Review.findOne({
            variant_id: variant_id || null,
            user_id: req.user._id,
            order_id: order_id || null
        });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Bạn đã đánh giá sản phẩm này trong đơn hàng này rồi' });
        }

        const review = await Review.create({
            product_id, variant_id, order_id,
            user_id: req.user._id,
            rating, comment, images
        });

        const populated = await Review.findById(review._id).populate('user_id', 'username');
        res.status(201).json({ success: true, data: populated });
    } catch (err) {
        // THÊM XỬ LÝ LỖI TRÙNG LẶP INDEX
        if (err.code === 11000) {
             return res.status(400).json({ success: false, message: 'Đánh giá cho sản phẩm này ở đơn hàng này đã tồn tại.' });
        }
        // Đổi chữ "error:" thành "message:" để Frontend show Toast lên
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 2. LẤY ĐÁNH GIÁ THEO SẢN PHẨM ──────────────────────────────────────────
exports.getProductReviews = async (req, res) => {
    try {
        const { product_id } = req.params;
        const { page = 1, limit = 10, rating } = req.query;

        let filter = { product_id: new mongoose.Types.ObjectId(product_id), is_visible: true };
        if (rating) filter.rating = Number(rating);

        const reviews = await Review.find(filter)
            .populate('user_id', 'username')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Review.countDocuments(filter);

        const stats = await Review.aggregate([
            { $match: { product_id: mongoose.Types.ObjectId.createFromHexString(product_id), is_visible: true } },
            {
                $group: {
                    _id: null,
                    avg_rating: { $avg: '$rating' },
                    total: { $sum: 1 },
                    five:  { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
                    four:  { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
                    three: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
                    two:   { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
                    one:   { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } }
                }
            }
        ]);

        res.json({
            success: true,
            stats: stats[0] ? {
                avg_rating: Math.round(stats[0].avg_rating * 10) / 10,
                total: stats[0].total,
                distribution: { 5: stats[0].five, 4: stats[0].four, 3: stats[0].three, 2: stats[0].two, 1: stats[0].one }
            } : { avg_rating: 0, total: 0 },
            total,
            page: Number(page),
            data: reviews
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── 3. LẤY ĐÁNH GIÁ CỦA USER THEO ĐƠN HÀNG ─────────────────────────────────
exports.getReviewsByOrder = async (req, res) => {
    try {
        const { order_id } = req.params;

        const reviews = await Review.find({
            order_id: new mongoose.Types.ObjectId(order_id),
            user_id: req.user._id
        }).populate('user_id', 'username');

        // Map theo variant_id để frontend dễ dùng
        res.json({ success: true, data: reviews });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── 4. CẬP NHẬT ĐÁNH GIÁ (Chủ sở hữu) ──────────────────────────────────────
exports.updateReview = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá' });

        if (review.user_id.toString() !== req.user._id.toString() && req.user.role_name !== 'Admin') {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền sửa đánh giá này' });
        }

        const { rating, comment, images } = req.body;
        if (rating) review.rating = rating;
        if (comment !== undefined) review.comment = comment;
        if (images) review.images = images;
        await review.save();

        const populated = await Review.findById(review._id).populate('user_id', 'username');
        res.json({ success: true, data: populated });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// ─── 5. ADMIN ẨN / HIỆN ĐÁNH GIÁ ─────────────────────────────────────────────
exports.toggleVisibility = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá' });

        review.is_visible = !review.is_visible;
        await review.save();
        res.json({ success: true, message: `Đánh giá đã ${review.is_visible ? 'hiển thị' : 'bị ẩn'}`, is_visible: review.is_visible });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── 6. XÓA ĐÁNH GIÁ ─────────────────────────────────────────────────────────
exports.deleteReview = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá' });

        if (review.user_id.toString() !== req.user._id.toString() && req.user.role_name !== 'Admin') {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa đánh giá này' });
        }

        await review.deleteOne();
        res.json({ success: true, message: 'Đã xóa đánh giá' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── 7. DANH SÁCH TẤT CẢ REVIEW (Admin quản lý) ─────────────────────────────
exports.getAllReviews = async (req, res) => {
    try {
        const { is_visible, product_id, rating, page = 1, limit = 20 } = req.query;
        let filter = {};

        if (is_visible !== undefined) filter.is_visible = is_visible === 'true';
        if (product_id) filter.product_id = product_id;
        if (rating) filter.rating = Number(rating);

        const reviews = await Review.find(filter)
            .populate('user_id', 'username email')
            .populate('product_id', 'name sku')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Review.countDocuments(filter);
        res.json({ success: true, total, page: Number(page), data: reviews });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
