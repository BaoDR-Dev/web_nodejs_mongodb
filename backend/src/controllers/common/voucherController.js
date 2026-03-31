const Voucher = require('../../models/common/Voucher');

// ─── 1. TẠO VOUCHER MỚI ──────────────────────────────────────────────────────
exports.createVoucher = async (req, res) => {
    try {
        const { code, description, discount_type, discount_value, max_discount,
                min_order_value, max_uses, starts_at, expires_at } = req.body;

        if (!code || !discount_type || !discount_value || !expires_at) {
            return res.status(400).json({ success: false, message: 'Thiếu trường bắt buộc: code, discount_type, discount_value, expires_at' });
        }

        if (discount_type === 'percent' && (discount_value <= 0 || discount_value > 100)) {
            return res.status(400).json({ success: false, message: 'Phần trăm giảm phải từ 1 đến 100' });
        }

        if (new Date(expires_at) <= new Date()) {
            return res.status(400).json({ success: false, message: 'Ngày hết hạn phải ở tương lai' });
        }

        const exists = await Voucher.findOne({ code: code.toUpperCase() });
        if (exists) return res.status(400).json({ success: false, message: 'Mã voucher đã tồn tại' });

        const voucher = await Voucher.create({
            code: code.toUpperCase(), description, discount_type, discount_value,
            max_discount, min_order_value, max_uses, starts_at, expires_at
        });

        res.status(201).json({ success: true, data: voucher });
    } catch (err) {
        console.error('[VOUCHER] createVoucher error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

// ─── 2. DANH SÁCH VOUCHER ────────────────────────────────────────────────────
exports.getAllVouchers = async (req, res) => {
    try {
        const { is_active, search, page = 1, limit = 20 } = req.query;
        let filter = {};
        if (is_active !== undefined) filter.is_active = is_active === 'true';
        if (search) filter.code = { $regex: search, $options: 'i' };

        const [vouchers, total] = await Promise.all([
            Voucher.find(filter)
                .sort({ createdAt: -1 })
                .skip((Number(page) - 1) * Number(limit))
                .limit(Number(limit)),
            Voucher.countDocuments(filter)
        ]);

        res.json({ success: true, total, page: Number(page), data: vouchers });
    } catch (err) {
        console.error('[VOUCHER] getAllVouchers error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

// ─── 3. KIỂM TRA VOUCHER (CHỈ PREVIEW - không ghi DB) ────────────────────────
// FIX HIGH: Hàm này CHỈ để preview giá trị giảm.
// Việc ghi nhận sử dụng thật sự được thực hiện trong orderController.createOrder
exports.applyVoucher = async (req, res) => {
    try {
        const { code, order_total } = req.body;
        if (!code || !order_total) {
            return res.status(400).json({ success: false, message: 'Thiếu mã voucher hoặc tổng đơn hàng' });
        }

        const voucher = await Voucher.findOne({ code: code.toUpperCase() });
        if (!voucher) return res.status(404).json({ success: false, message: 'Mã voucher không tồn tại' });
        if (!voucher.is_active) return res.status(400).json({ success: false, message: 'Voucher đã bị vô hiệu hóa' });

        const now = new Date();
        if (now < voucher.starts_at) return res.status(400).json({ success: false, message: 'Voucher chưa đến thời gian sử dụng' });
        if (now > voucher.expires_at) return res.status(400).json({ success: false, message: 'Voucher đã hết hạn' });
        if (voucher.used_count >= voucher.max_uses) {
            return res.status(400).json({ success: false, message: 'Voucher đã hết lượt sử dụng' });
        }

        const alreadyUsed = voucher.used_by.some(id => id.toString() === req.user._id.toString());
        if (alreadyUsed) return res.status(400).json({ success: false, message: 'Bạn đã sử dụng voucher này rồi' });

        if (order_total < voucher.min_order_value) {
            return res.status(400).json({
                success: false,
                message: `Đơn hàng tối thiểu ${voucher.min_order_value.toLocaleString('vi-VN')}₫ để dùng voucher này`
            });
        }

        let discount_amount = 0;
        if (voucher.discount_type === 'percent') {
            discount_amount = (order_total * voucher.discount_value) / 100;
            if (voucher.max_discount) discount_amount = Math.min(discount_amount, voucher.max_discount);
        } else {
            discount_amount = voucher.discount_value;
        }
        discount_amount = Math.min(Math.round(discount_amount), order_total);

        // KHÔNG ghi DB ở đây — chỉ trả về thông tin preview
        res.json({
            success: true,
            message: 'Voucher hợp lệ',
            data: {
                voucher_id: voucher._id,
                code: voucher.code,
                discount_type: voucher.discount_type,
                discount_value: voucher.discount_value,
                discount_amount,
                final_total: order_total - discount_amount
            }
        });
    } catch (err) {
        console.error('[VOUCHER] applyVoucher error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

// ─── 4. CẬP NHẬT VOUCHER ─────────────────────────────────────────────────────
exports.updateVoucher = async (req, res) => {
    try {
        // Whitelist các field được phép cập nhật
        const { description, discount_value, max_discount, min_order_value, max_uses, expires_at, is_active } = req.body;
        const allowedUpdate = {};
        if (description !== undefined) allowedUpdate.description = description;
        if (discount_value !== undefined) allowedUpdate.discount_value = discount_value;
        if (max_discount !== undefined) allowedUpdate.max_discount = max_discount;
        if (min_order_value !== undefined) allowedUpdate.min_order_value = min_order_value;
        if (max_uses !== undefined) allowedUpdate.max_uses = max_uses;
        if (expires_at !== undefined) allowedUpdate.expires_at = expires_at;
        if (is_active !== undefined) allowedUpdate.is_active = is_active;

        const updated = await Voucher.findByIdAndUpdate(req.params.id, allowedUpdate, { new: true, runValidators: true });
        if (!updated) return res.status(404).json({ success: false, message: 'Không tìm thấy voucher' });
        res.json({ success: true, data: updated });
    } catch (err) {
        console.error('[VOUCHER] updateVoucher error:', err.message);
        res.status(400).json({ success: false, message: err.message });
    }
};

// ─── 5. BẬT / TẮT VOUCHER ────────────────────────────────────────────────────
exports.toggleVoucher = async (req, res) => {
    try {
        const voucher = await Voucher.findById(req.params.id);
        if (!voucher) return res.status(404).json({ success: false, message: 'Không tìm thấy voucher' });

        voucher.is_active = !voucher.is_active;
        await voucher.save();
        res.json({ success: true, message: `Voucher đã ${voucher.is_active ? 'kích hoạt' : 'vô hiệu hóa'}`, is_active: voucher.is_active });
    } catch (err) {
        console.error('[VOUCHER] toggleVoucher error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

// ─── 6. XÓA VOUCHER ──────────────────────────────────────────────────────────
exports.deleteVoucher = async (req, res) => {
    try {
        const voucher = await Voucher.findById(req.params.id);
        if (!voucher) return res.status(404).json({ success: false, message: 'Không tìm thấy voucher' });
        if (voucher.used_count > 0) {
            return res.status(400).json({ success: false, message: 'Không thể xóa voucher đã được sử dụng' });
        }
        await voucher.deleteOne();
        res.json({ success: true, message: 'Đã xóa voucher' });
    } catch (err) {
        console.error('[VOUCHER] deleteVoucher error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

// ─── 7. THỐNG KÊ VOUCHER ─────────────────────────────────────────────────────
exports.getVoucherStats = async (req, res) => {
    try {
        const voucher = await Voucher.findById(req.params.id).populate('used_by', 'username email');
        if (!voucher) return res.status(404).json({ success: false, message: 'Không tìm thấy voucher' });

        res.json({
            success: true,
            data: {
                code: voucher.code,
                max_uses: voucher.max_uses,
                used_count: voucher.used_count,
                remaining: voucher.max_uses - voucher.used_count,
                usage_rate: voucher.max_uses > 0
                    ? `${((voucher.used_count / voucher.max_uses) * 100).toFixed(1)}%`
                    : '0%',
                used_by: voucher.used_by
            }
        });
    } catch (err) {
        console.error('[VOUCHER] getVoucherStats error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};
