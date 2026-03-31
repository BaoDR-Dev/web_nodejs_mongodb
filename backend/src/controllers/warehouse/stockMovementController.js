const StockMovement = require('../../models/warehouse/StockMovement');
const ProductVariant = require('../../models/products/ProductVariant');
const Inventory = require('../../models/warehouse/Inventory');
const mongoose = require('mongoose');

// ─── 1. GHI NHẬN BIẾN ĐỘNG KHO (Nhập/Xuất/Điều chỉnh) ───────────────────────
exports.recordMovement = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { variant_id, location_id, movement_type, quantity_change, reason, order_id } = req.body;

        if (!variant_id || !movement_type || quantity_change === undefined) {
            return res.status(400).json({ success: false, message: 'Thiếu variant_id, movement_type hoặc quantity_change' });
        }

        const variant = await ProductVariant.findById(variant_id).session(session);
        if (!variant) return res.status(404).json({ success: false, message: 'Không tìm thấy biến thể sản phẩm' });

        const quantity_before = variant.stock_quantity;
        const quantity_after = quantity_before + quantity_change;

        if (quantity_after < 0) {
            return res.status(400).json({ success: false, message: `Không đủ hàng. Tồn kho hiện tại: ${quantity_before}` });
        }

        // Cập nhật tồn kho tổng trên ProductVariant
        variant.stock_quantity = quantity_after;
        await variant.save({ session });

        // Cập nhật Inventory theo Location nếu có
        if (location_id) {
            const inventory = await Inventory.findOne({ variant_id, location_id }).session(session);
            if (inventory) {
                inventory.quantity += quantity_change;
                await inventory.save({ session });
            } else if (quantity_change > 0) {
                await Inventory.create([{ variant_id, location_id, quantity: quantity_change }], { session });
            }
        }

        // Ghi log StockMovement
        const movement = await StockMovement.create([{
            variant_id, location_id, order_id,
            movement_type,
            quantity_change,
            quantity_before,
            quantity_after,
            reason,
            created_by: req.user._id
        }], { session });

        await session.commitTransaction();

        res.status(201).json({
            success: true,
            message: `Đã ghi nhận biến động kho. Tồn kho: ${quantity_before} → ${quantity_after}`,
            data: movement[0]
        });
    } catch (err) {
        await session.abortTransaction();
        res.status(500).json({ success: false, error: err.message });
    } finally {
        session.endSession();
    }
};

// ─── 2. CHUYỂN KHO (TRANSFER giữa 2 kệ) ──────────────────────────────────────
exports.transferStock = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { variant_id, from_location_id, to_location_id, quantity, reason } = req.body;

        if (!variant_id || !from_location_id || !to_location_id || !quantity) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin chuyển kho' });
        }
        if (from_location_id === to_location_id) {
            return res.status(400).json({ success: false, message: 'Kệ nguồn và kệ đích không được trùng nhau' });
        }

        // Kiểm tra tồn kho tại kệ nguồn
        const fromInventory = await Inventory.findOne({ variant_id, location_id: from_location_id }).session(session);
        if (!fromInventory || fromInventory.quantity < quantity) {
            return res.status(400).json({ success: false, message: `Không đủ hàng tại kệ nguồn. Hiện có: ${fromInventory?.quantity || 0}` });
        }

        // Trừ kệ nguồn
        fromInventory.quantity -= quantity;
        await fromInventory.save({ session });

        // Cộng vào kệ đích
        let toInventory = await Inventory.findOne({ variant_id, location_id: to_location_id }).session(session);
        if (toInventory) {
            toInventory.quantity += quantity;
            await toInventory.save({ session });
        } else {
            await Inventory.create([{ variant_id, location_id: to_location_id, quantity }], { session });
        }

        // Ghi 1 bản ghi TRANSFER
        await StockMovement.create([{
            variant_id,
            location_id: to_location_id,
            movement_type: 'TRANSFER',
            quantity_change: quantity,
            quantity_before: fromInventory.quantity + quantity,
            quantity_after: fromInventory.quantity,
            reason: reason || `Chuyển từ kệ ${from_location_id} sang ${to_location_id}`,
            created_by: req.user._id
        }], { session });

        await session.commitTransaction();
        res.json({ success: true, message: `Đã chuyển ${quantity} sản phẩm thành công` });
    } catch (err) {
        await session.abortTransaction();
        res.status(500).json({ success: false, error: err.message });
    } finally {
        session.endSession();
    }
};

// ─── 3. LỊCH SỬ BIẾN ĐỘNG THEO SẢN PHẨM ──────────────────────────────────────
exports.getMovementsByVariant = async (req, res) => {
    try {
        const { variant_id } = req.params;
        const { movement_type, page = 1, limit = 20 } = req.query;

        let filter = { variant_id };
        if (movement_type) filter.movement_type = movement_type;

        const movements = await StockMovement.find(filter)
            .populate('created_by', 'username')
            .populate('location_id', 'location_name')
            .populate('order_id', '_id status')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await StockMovement.countDocuments(filter);
        res.json({ success: true, total, page: Number(page), data: movements });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── 4. LỊCH SỬ BIẾN ĐỘNG TOÀN KHO (Admin) ───────────────────────────────────
exports.getAllMovements = async (req, res) => {
    try {
        const { movement_type, location_id, created_by, from_date, to_date, page = 1, limit = 30 } = req.query;
        let filter = {};

        if (movement_type) filter.movement_type = movement_type;
        if (location_id) filter.location_id = location_id;
        if (created_by) filter.created_by = created_by;
        if (from_date || to_date) {
            filter.createdAt = {};
            if (from_date) filter.createdAt.$gte = new Date(from_date);
            if (to_date) filter.createdAt.$lte = new Date(to_date);
        }

        const movements = await StockMovement.find(filter)
            .populate('variant_id', 'sku stock_quantity')
            .populate('created_by', 'username')
            .populate('location_id', 'location_name')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await StockMovement.countDocuments(filter);
        res.json({ success: true, total, page: Number(page), data: movements });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── 5. KIỂM KHO (So sánh thực tế vs hệ thống) ───────────────────────────────
exports.stockAudit = async (req, res) => {
    try {
        const { location_id } = req.query;
        let filter = {};
        if (location_id) filter.location_id = location_id;

        const inventories = await Inventory.find(filter)
            .populate({ path: 'variant_id', populate: { path: 'product_id', select: 'name sku' } })
            .populate('location_id', 'location_name');

        const report = inventories.map(inv => ({
            location: inv.location_id?.location_name,
            product: inv.variant_id?.product_id?.name,
            variant_sku: inv.variant_id?.sku,
            system_quantity: inv.quantity,
            total_stock: inv.variant_id?.stock_quantity
        }));

        res.json({ success: true, count: report.length, data: report });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};