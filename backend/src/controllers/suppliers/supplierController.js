const Supplier = require('../../models/common/Supplier');
const Order    = require('../../models/orders/Order');
const mongoose = require('mongoose');

// ─── 1. DANH SÁCH + TÌM KIẾM ─────────────────────────────────────────────────
exports.listSuppliers = async (req, res) => {
    try {
        const { name, phone, email, is_active, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (name)  filter.name  = { $regex: name,  $options: 'i' };
        if (phone) filter.phone = { $regex: phone, $options: 'i' };
        if (email) filter.email = { $regex: email, $options: 'i' };
        if (is_active !== undefined) filter.is_active = is_active === 'true';

        const [suppliers, total] = await Promise.all([
            Supplier.find(filter)
                .sort({ name: 1 })
                .skip((Number(page) - 1) * Number(limit))
                .limit(Number(limit)),
            Supplier.countDocuments(filter)
        ]);

        res.json({ success: true, total, page: Number(page), data: suppliers });
    } catch (err) {
        console.error('[SUPPLIER] list error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

// ─── 2. CHI TIẾT ─────────────────────────────────────────────────────────────
exports.getSupplierById = async (req, res) => {
    try {
        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy nhà cung cấp' });
        }
        res.json({ success: true, data: supplier });
    } catch (err) {
        res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    }
};

// ─── 3. TẠO MỚI ──────────────────────────────────────────────────────────────
exports.createSupplier = async (req, res) => {
    try {
        const { name, phone, email, address, contact_person, tax_code, note } = req.body;

        if (!name?.trim()) {
            return res.status(400).json({ success: false, message: 'Tên nhà cung cấp là bắt buộc' });
        }

        // Kiểm tra trùng tên
        const exists = await Supplier.findOne({ name: name.trim() });
        if (exists) {
            return res.status(400).json({ success: false, message: 'Nhà cung cấp với tên này đã tồn tại' });
        }

        const supplier = await Supplier.create({
            name: name.trim(), phone, email, address,
            contact_person, tax_code, note
        });

        res.status(201).json({ success: true, message: 'Tạo nhà cung cấp thành công', data: supplier });
    } catch (err) {
        console.error('[SUPPLIER] create error:', err.message);
        res.status(400).json({ success: false, message: err.message });
    }
};

// ─── 4. CẬP NHẬT ─────────────────────────────────────────────────────────────
exports.updateSupplier = async (req, res) => {
    try {
        const { name, phone, email, address, contact_person, tax_code, note, is_active } = req.body;

        const updated = await Supplier.findByIdAndUpdate(
            req.params.id,
            { name, phone, email, address, contact_person, tax_code, note, is_active },
            { new: true, runValidators: true }
        );

        if (!updated) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy nhà cung cấp' });
        }
        res.json({ success: true, message: 'Cập nhật thành công', data: updated });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// ─── 5. BẬT / TẮT HOẠT ĐỘNG ─────────────────────────────────────────────────
exports.toggleSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy nhà cung cấp' });
        }
        supplier.is_active = !supplier.is_active;
        await supplier.save();
        res.json({
            success: true,
            message: `Nhà cung cấp đã ${supplier.is_active ? 'kích hoạt' : 'vô hiệu hóa'}`,
            is_active: supplier.is_active
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 6. XÓA ──────────────────────────────────────────────────────────────────
exports.deleteSupplier = async (req, res) => {
    try {
        // Không cho xóa nếu đã có đơn nhập hàng liên quan
        const hasOrders = await Order.exists({ supplier_id: req.params.id });
        if (hasOrders) {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa nhà cung cấp đã có đơn nhập hàng. Hãy tắt hoạt động thay vì xóa.'
            });
        }

        const supplier = await Supplier.findByIdAndDelete(req.params.id);
        if (!supplier) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy nhà cung cấp' });
        }
        res.json({ success: true, message: 'Đã xóa nhà cung cấp' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 7. LỊCH SỬ NHẬP HÀNG CỦA NHÀ CUNG CẤP ─────────────────────────────────
exports.getSupplierOrders = async (req, res) => {
    try {
        const { page = 1, limit = 20, from_date, to_date } = req.query;

        const match = { supplier_id: new mongoose.Types.ObjectId(req.params.id), order_type: 'IN' };
        if (from_date || to_date) {
            match.createdAt = {};
            if (from_date) match.createdAt.$gte = new Date(from_date);
            if (to_date)   match.createdAt.$lte = new Date(to_date);
        }

        const [orders, total, totalSpentAgg] = await Promise.all([
            Order.find(match)
                .populate('warehouse_id', 'warehouse_name address')
                .populate('user_id', 'username')
                .populate({
                    path: 'details.variant_id',
                    populate: { path: 'product_id', select: 'name sku' }
                })
                .sort({ createdAt: -1 })
                .skip((Number(page) - 1) * Number(limit))
                .limit(Number(limit)),
            Order.countDocuments(match),
            Order.aggregate([
                { $match: { ...match, status: 'Completed' } },
                { $group: { _id: null, total: { $sum: '$total_price' }, count: { $sum: 1 } } }
            ])
        ]);

        res.json({
            success: true,
            total,
            total_spent:   totalSpentAgg[0]?.total || 0,
            import_count:  totalSpentAgg[0]?.count || 0,
            page: Number(page),
            data: orders
        });
    } catch (err) {
        console.error('[SUPPLIER] getOrders error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 8. THỐNG KÊ TỔNG QUAN ───────────────────────────────────────────────────
exports.getSupplierStats = async (req, res) => {
    try {
        const [total, active, topSuppliers] = await Promise.all([
            Supplier.countDocuments(),
            Supplier.countDocuments({ is_active: true }),
            Order.aggregate([
                { $match: { order_type: 'IN', status: 'Completed', supplier_id: { $ne: null } } },
                { $group: { _id: '$supplier_id', total_spent: { $sum: '$total_price' }, order_count: { $sum: 1 } } },
                { $sort: { total_spent: -1 } },
                { $limit: 5 },
                { $lookup: { from: 'suppliers', localField: '_id', foreignField: '_id', as: 'supplier' } },
                { $unwind: { path: '$supplier', preserveNullAndEmptyArrays: true } },
                { $project: {
                    supplier_name:  '$supplier.name',
                    supplier_phone: '$supplier.phone',
                    total_spent: 1,
                    order_count: 1
                }}
            ])
        ]);

        res.json({
            success: true,
            data: {
                total_suppliers:  total,
                active_suppliers: active,
                top_suppliers:    topSuppliers
            }
        });
    } catch (err) {
        console.error('[SUPPLIER] stats error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};
