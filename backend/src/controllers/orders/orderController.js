const { sendOrderConfirmEmail } = require("../../services/mailService");
const Order = require('../../models/orders/Order');
const ProductVariant = require('../../models/products/ProductVariant');
const Inventory = require('../../models/warehouse/Inventory');
const StockMovement = require('../../models/warehouse/StockMovement');
const Voucher = require('../../models/common/Voucher');
const Cart = require('../../models/orders/Cart');
const Customer = require('../../models/customers/Customer');
const mongoose = require('mongoose');
const Product       = require('../../models/products/Product');
const P_Image       = require('../../models/products/ProductImage');
const Location      = require('../../models/warehouse/Location');
const Supplier      = require('../../models/common/Supplier');

// ─── HELPER: Phân bổ tồn kho từ nhiều kệ ────────────────────────────────────
// Trả về mảng [{ inventory, takeQty }] — gộp nhiều kệ nếu 1 kệ không đủ
const allocateInventory = async (variant_id, quantity, session) => {
    const shelves = await Inventory.find({ variant_id, quantity: { $gt: 0 } })
        .populate({ path: 'location_id', select: 'warehouse_id location_name status' })
        .session(session)
        .sort({ quantity: -1 });

    const total = shelves.reduce((sum, s) => sum + s.quantity, 0);
    if (total < quantity) return null;

    let remaining = quantity;
    const allocated = [];
    for (const shelf of shelves) {
        if (remaining <= 0) break;
        const take = Math.min(shelf.quantity, remaining);
        allocated.push({ inventory: shelf, takeQty: take });
        remaining -= take;
    }
    return allocated;
};

// ─── 1. TẠO ĐƠN HÀNG (OUT - Bán hàng) ───────────────────────────────────────
// Customer chỉ cần truyền items + payment_method
// Server tự tìm kho/kệ có hàng, tự trừ tồn kho đúng chỗ
exports.createOrder = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { items, voucher_code, payment_method, shipping_address } = req.body;

        if (!items?.length) {
            return res.status(400).json({ success: false, message: 'Đơn hàng phải có ít nhất 1 sản phẩm' });
        }
        if (!payment_method) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn phương thức thanh toán' });
        }

        // ── BƯỚC 1: Validate và tìm hàng cho từng item ───────────────────────
        let orderDetails = [];
        let serverTotal = 0;

        for (const item of items) {
            // 1a. Kiểm tra variant tồn tại
            const variant = await ProductVariant.findById(item.variant_id).session(session);
            if (!variant) {
                await session.abortTransaction();
                return res.status(404).json({
                    success: false,
                    message: `Không tìm thấy sản phẩm ID: ${item.variant_id}`
                });
            }

            // 1b. Phân bổ tồn kho từ nhiều kệ nếu cần
            const allocated = await allocateInventory(item.variant_id, item.quantity, session);

            if (!allocated) {
                const totalStock = await Inventory.aggregate([
                    { $match: { variant_id: new mongoose.Types.ObjectId(item.variant_id) } },
                    { $group: { _id: null, total: { $sum: '$quantity' } } }
                ]);
                const stock = totalStock[0]?.total || 0;
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: stock === 0
                        ? `Sản phẩm "${variant.sku}" đã hết hàng`
                        : `Sản phẩm "${variant.sku}" không đủ số lượng. Tồn kho: ${stock}, yêu cầu: ${item.quantity}`
                });
            }

            // 1c. Atomic decrement tồn kho tổng trên ProductVariant
            const updatedVariant = await ProductVariant.findOneAndUpdate(
                { _id: item.variant_id, stock_quantity: { $gte: item.quantity } },
                { $inc: { stock_quantity: -item.quantity } },
                { new: true, session }
            );

            if (!updatedVariant) {
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: `Sản phẩm "${variant.sku}" vừa hết hàng, vui lòng thử lại`
                });
            }

            // 1d. Trừ tồn kho từng kệ đã phân bổ + ghi nhật ký
            for (const { inventory, takeQty } of allocated) {
                await Inventory.findByIdAndUpdate(
                    inventory._id,
                    { $inc: { quantity: -takeQty } },
                    { session }
                );

                const warehouse_id = inventory.location_id?.warehouse_id || null;
                await StockMovement.create([{
                    variant_id: variant._id,
                    location_id: inventory.location_id?._id || inventory.location_id,
                    warehouse_id,
                    movement_type: 'OUT',
                    quantity_change: -takeQty,
                    quantity_before: inventory.quantity,
                    quantity_after: inventory.quantity - takeQty,
                    reason: 'Xuất kho theo đơn hàng',
                    created_by: req.user._id
                }], { session });
            }

            const unit_price = updatedVariant.price;
            serverTotal += unit_price * item.quantity;

            // Mỗi kệ tạo 1 detail line trong đơn hàng
            for (const { inventory, takeQty } of allocated) {
                orderDetails.push({
                    variant_id: variant._id,
                    location_id: inventory.location_id?._id || inventory.location_id,
                    quantity: takeQty,
                    unit_price
                });
            }
        }

        // ── BƯỚC 2: Xử lý voucher ────────────────────────────────────────────
        let discount_amount = 0;
        let voucher_id = null;

        if (voucher_code) {
            const voucher = await Voucher.findOne({
                code: voucher_code.toUpperCase(),
                is_active: true,
                expires_at: { $gt: new Date() },
                starts_at: { $lte: new Date() },
                $expr: { $lt: ['$used_count', '$max_uses'] }
            }).session(session);

            if (!voucher) {
                await session.abortTransaction();
                return res.status(400).json({ success: false, message: 'Voucher không hợp lệ hoặc đã hết lượt' });
            }

            if (voucher.used_by.some(id => id.toString() === req.user._id.toString())) {
                await session.abortTransaction();
                return res.status(400).json({ success: false, message: 'Bạn đã sử dụng voucher này rồi' });
            }

            if (serverTotal < voucher.min_order_value) {
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: `Đơn hàng tối thiểu ${voucher.min_order_value.toLocaleString('vi-VN')}₫ để dùng voucher`
                });
            }

            if (voucher.discount_type === 'percent') {
                discount_amount = (serverTotal * voucher.discount_value) / 100;
                if (voucher.max_discount) discount_amount = Math.min(discount_amount, voucher.max_discount);
            } else {
                discount_amount = voucher.discount_value;
            }
            discount_amount = Math.min(Math.round(discount_amount), serverTotal);

            await Voucher.findByIdAndUpdate(voucher._id, {
                $inc: { used_count: 1 },
                $push: { used_by: req.user._id }
            }, { session });

            voucher_id = voucher._id;
        }

        const total_price = serverTotal - discount_amount;

        // ── BƯỚC 3: Tạo đơn hàng ─────────────────────────────────────────────
        const customer = await Customer.findOne({ user_id: req.user._id }).session(session);

        const newOrder = await Order.create([{
            order_type: 'OUT',
            user_id: req.user._id,
            customer_id: customer?._id,
            voucher_id,
            discount_amount,
            total_price,
            status: 'Draft',
            details: orderDetails,
            shipping_address,
            payments: [{ method: payment_method, amount: total_price }]
        }], { session });

        // ── BƯỚC 4: Xóa mềm item đã đặt khỏi giỏ hàng ─────────────────────────
        const variantIds = items.map(i => i.variant_id.toString());
        await Cart.updateOne(
            { user_id: req.user._id },
            { $set: { 'items.$[elem].is_deleted': true } },
            { arrayFilters: [{ 'elem.variant_id': { $in: variantIds }, 'elem.is_deleted': false }], session }
        );

        // ── BƯỚC 5: Cập nhật tổng chi tiêu khách ─────────────────────────────
        if (customer) {
            await Customer.findByIdAndUpdate(
                customer._id,
                { $inc: { total_spending: total_price } },
                { session }
            );
        }

        await session.commitTransaction();

        // Gửi email xác nhận đơn hàng (không block response)
        try {
            const User = require('../../models/auth/User');
            const userDoc = await User.findById(req.user._id);
            const customerDoc = await Customer.findOne({ user_id: req.user._id });
            const populatedOrder = await require('../../models/orders/Order').findById(newOrder[0]._id)
                .populate({ path: 'details.variant_id', populate: { path: 'product_id', select: 'name' } });
            if (userDoc?.email && populatedOrder) {
                sendOrderConfirmEmail({
                    to: userDoc.email,
                    full_name: customerDoc?.full_name || userDoc.username,
                    order: populatedOrder
                }).catch(e => console.error('[MAIL] Order confirm lỗi:', e.message));
            }
        } catch (mailErr) {
            console.error('[MAIL] Order confirm error:', mailErr.message);
        }

        res.status(201).json({
            success: true,
            message: 'Đặt hàng thành công',
            data: {
                order_id: newOrder[0]._id,
                total_price,
                discount_amount,
                items_count: orderDetails.length
            }
        });
    } catch (err) {
        await session.abortTransaction();
        console.error('[ORDER] createOrder error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ, đơn hàng chưa được tạo' });
    } finally {
        session.endSession();
    }
};

// ─── 2. NHẬP HÀNG (IN - Admin/Staff nhập từ nhà cung cấp) ───────────────────
// Bắt buộc truyền warehouse_id và location_id vì đây là thao tác kho nội bộ
exports.createImportOrder = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { supplier_id, supplier_note, invoice_number, items } = req.body;
 
        // ── Validate đầu vào cơ bản ──────────────────────────────────────────
        if (!items?.length) {
            return res.status(400).json({ success: false, message: 'Phải có ít nhất 1 sản phẩm' });
        }
        if (!supplier_id) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn nhà cung cấp' });
        }
 
        // ── Validate supplier ─────────────────────────────────────────────────
        const supplier = await Supplier.findById(supplier_id).session(session);
        if (!supplier) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy nhà cung cấp' });
        }
        if (!supplier.is_active) {
            return res.status(400).json({ success: false, message: 'Nhà cung cấp đã ngừng hoạt động' });
        }
 
        let orderDetails = [];
        let total_price  = 0;
        // Dùng để track warehouse_id chung (lấy từ location đầu tiên)
        let warehouse_id = null;
 
        for (const item of items) {
            // ── BƯỚC 1: Resolve variant ───────────────────────────────────────
            let variant;
 
            if (item.variant_id) {
                // Cách 1: Variant đã có sẵn
                variant = await ProductVariant.findById(item.variant_id).session(session);
                if (!variant) {
                    await session.abortTransaction();
                    return res.status(404).json({ success: false, message: `Không tìm thấy variant: ${item.variant_id}` });
                }
 
            } else if (item.product_id && item.new_variant) {
                // Cách 2: Tạo variant mới cho sản phẩm đã có
                const product = await Product.findById(item.product_id).session(session);
                if (!product) {
                    await session.abortTransaction();
                    return res.status(404).json({ success: false, message: `Không tìm thấy sản phẩm: ${item.product_id}` });
                }
 
                if (!item.new_variant.sku || item.new_variant.price == null) {
                    await session.abortTransaction();
                    return res.status(400).json({ success: false, message: 'Variant mới cần có sku và price' });
                }
 
                const created = await ProductVariant.create([{
                    ...item.new_variant,
                    product_id:     item.product_id,
                    stock_quantity: 0   // sẽ cộng sau
                }], { session });
                variant = created[0];
 
            } else if (item.new_product && item.new_variant) {
                // Cách 3: Tạo sản phẩm mới + variant mới
                if (!item.new_product.name || !item.new_product.sku) {
                    await session.abortTransaction();
                    return res.status(400).json({ success: false, message: 'Sản phẩm mới cần có name và sku' });
                }
                if (!item.new_variant.sku || item.new_variant.price == null) {
                    await session.abortTransaction();
                    return res.status(400).json({ success: false, message: 'Variant mới cần có sku và price' });
                }
 
                const newProduct = await Product.create([item.new_product], { session });
                const created    = await ProductVariant.create([{
                    ...item.new_variant,
                    product_id:     newProduct[0]._id,
                    stock_quantity: 0
                }], { session });
                variant = created[0];
 
            } else {
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: 'Mỗi item cần có: variant_id HOẶC (product_id + new_variant) HOẶC (new_product + new_variant)'
                });
            }
 
            // ── BƯỚC 2: Validate locations ────────────────────────────────────
            if (!item.locations?.length) {
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: `Variant "${variant.sku}" phải có ít nhất 1 kệ hàng (locations[])`
                });
            }
 
            // Tổng số lượng nhập của item này
            const totalQty = item.locations.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0);
            if (totalQty <= 0) {
                await session.abortTransaction();
                return res.status(400).json({ success: false, message: `Số lượng nhập của "${variant.sku}" phải > 0` });
            }
 
            const import_price = item.import_price ?? variant.price;
            total_price += import_price * totalQty;
 
            // ── BƯỚC 3: Cộng tồn kho tổng ────────────────────────────────────
            await ProductVariant.findByIdAndUpdate(
                variant._id,
                { $inc: { stock_quantity: totalQty } },
                { session }
            );
 
            // ── BƯỚC 4: Phân bổ từng kệ ──────────────────────────────────────
            for (const loc of item.locations) {
                const locQty = Number(loc.quantity) || 0;
                if (locQty <= 0) continue;
 
                // Validate kệ tồn tại và không đang bảo trì
                const location = await Location.findById(loc.location_id).session(session);
                if (!location) {
                    await session.abortTransaction();
                    return res.status(404).json({ success: false, message: `Không tìm thấy kệ: ${loc.location_id}` });
                }
                if (location.status === 'Maintenance') {
                    await session.abortTransaction();
                    return res.status(400).json({
                        success: false,
                        message: `Kệ "${location.location_name}" đang bảo trì, không thể nhập hàng`
                    });
                }
 
                // Lấy warehouse_id từ location đầu tiên
                if (!warehouse_id) warehouse_id = location.warehouse_id;
 
                // Upsert Inventory cho kệ này
                const existingInv = await Inventory.findOne({
                    variant_id: variant._id,
                    location_id: loc.location_id
                }).session(session);
 
                const qtyBefore = existingInv?.quantity || 0;
 
                await Inventory.findOneAndUpdate(
                    { variant_id: variant._id, location_id: loc.location_id },
                    { $inc: { quantity: locQty } },
                    { upsert: true, new: true, session }
                );
 
                // Ghi nhật ký kho
                await StockMovement.create([{
                    variant_id:      variant._id,
                    location_id:     loc.location_id,
                    warehouse_id:    location.warehouse_id,
                    movement_type:   'IN',
                    quantity_change: locQty,
                    quantity_before: qtyBefore,
                    quantity_after:  qtyBefore + locQty,
                    reason:          supplier_note || `Nhập hàng từ NCC: ${supplier.name}`,
                    created_by:      req.user._id
                }], { session });
 
                // Nếu kệ đang Active mà sau khi nhập đầy → cập nhật status Full
                // (logic tuỳ chọn — bỏ comment nếu muốn bật)
                // if (location.status === 'Active' && location.capacity) {
                //   const newTotal = qtyBefore + locQty;
                //   if (newTotal >= location.capacity) {
                //     await Location.findByIdAndUpdate(loc.location_id, { status: 'Full' }, { session });
                //   }
                // }
            }
 
            // ── BƯỚC 5: Ghi vào order details ────────────────────────────────
            // Mỗi kệ là 1 detail line để truy vết chính xác
            for (const loc of item.locations) {
                const locQty = Number(loc.quantity) || 0;
                if (locQty <= 0) continue;
                orderDetails.push({
                    variant_id:  variant._id,
                    location_id: loc.location_id,
                    quantity:    locQty,
                    unit_price:  import_price
                });
            }
        }
 
        // ── Tạo đơn nhập ─────────────────────────────────────────────────────
        const newOrder = await Order.create([{
            order_type:     'IN',
            user_id:        req.user._id,
            warehouse_id:   warehouse_id || null,
            supplier_id,
            supplier_note:  supplier_note  || null,
            invoice_number: invoice_number || null,
            total_price,
            status:  'Completed',
            details: orderDetails
        }], { session });
 
        await session.commitTransaction();
 
        res.status(201).json({
            success: true,
            message: `Nhập hàng thành công — ${orderDetails.length} dòng hàng từ ${items.length} sản phẩm`,
            data: {
                order_id:    newOrder[0]._id,
                total_price,
                items_count: items.length,
                details:     orderDetails.length
            }
        });
 
    } catch (err) {
        await session.abortTransaction();
        if (err.code === 11000) {
            return res.status(400).json({ success: false, message: 'SKU đã tồn tại trong hệ thống' });
        }
        console.error('[ORDER] createImportOrder error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    } finally {
        session.endSession();
    }
};

// ─── 3. DANH SÁCH ĐƠN HÀNG ───────────────────────────────────────────────────
exports.getAllOrders = async (req, res) => {
    try {
        const { status, order_type, customer_id, from_date, to_date, page = 1, limit = 20 } = req.query;
        let filter = {};
        if (status) filter.status = status;
        if (order_type) filter.order_type = order_type;
        if (customer_id) filter.customer_id = customer_id;
        if (from_date || to_date) {
            filter.createdAt = {};
            if (from_date) filter.createdAt.$gte = new Date(from_date);
            if (to_date) filter.createdAt.$lte = new Date(to_date);
        }

        const orders = await Order.find(filter)
            .populate('customer_id', 'full_name phone')
            .populate('user_id', 'username')
            .populate('voucher_id', 'code discount_type discount_value')
            .populate('supplier_id', 'name phone contact_person')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Order.countDocuments(filter);
        res.json({ success: true, total, page: Number(page), data: orders });
    } catch (err) {
        console.error('[ORDER] getAllOrders error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

// ─── 4. ĐƠN HÀNG CỦA KHÁCH ───────────────────────────────────────────────────
exports.getMyOrders = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        let filter = { user_id: req.user._id, order_type: 'OUT' };
        if (status) filter.status = status;

        const orders = await Order.find(filter)
            .populate({ path: 'details.variant_id', populate: { path: 'product_id', select: 'name' } })
            .populate('voucher_id', 'code')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Order.countDocuments(filter);
        res.json({ success: true, total, page: Number(page), data: orders });
    } catch (err) {
        console.error('[ORDER] getMyOrders error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

// ─── 5. CHI TIẾT ĐƠN HÀNG ────────────────────────────────────────────────────
exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('customer_id', 'full_name phone address')
            .populate('user_id', 'username email')
            .populate('voucher_id', 'code discount_type discount_value')
            .populate({
                path: 'details.variant_id',
                populate: [
                    { path: 'product_id', select: 'name sku' },
                    { path: 'color_id', select: 'color_name' },
                    { path: 'size_id', select: 'size_name' }
                ]
            });

        if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });

        const isOwner = order.user_id?._id?.toString() === req.user._id.toString();
        const isStaff = ['Admin', 'Manager', 'Staff'].includes(req.user.role_name);
        if (!isOwner && !isStaff) {
            return res.status(403).json({ success: false, message: 'Không có quyền xem đơn hàng này' });
        }

        res.json({ success: true, data: order });
    } catch (err) {
        console.error('[ORDER] getOrderById error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

// ─── 6. CẬP NHẬT TRẠNG THÁI ──────────────────────────────────────────────────
exports.updateOrderStatus = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { status } = req.body;
        const validTransitions = {
            'Draft': ['Completed', 'Cancelled'],
            'Completed': [],
            'Cancelled': []
        };

        const order = await Order.findById(req.params.id).session(session);
        if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });

        const allowed = validTransitions[order.status] || [];
        if (!allowed.includes(status)) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: `Không thể chuyển từ "${order.status}" sang "${status}"`
            });
        }

        // Hủy đơn → hoàn lại tồn kho
        if (status === 'Cancelled' && order.order_type === 'OUT') {
            for (const detail of order.details) {
                // Hoàn tồn kho tổng
                await ProductVariant.findByIdAndUpdate(
                    detail.variant_id,
                    { $inc: { stock_quantity: detail.quantity } },
                    { session }
                );

                // Hoàn tồn kho theo kệ
                if (detail.location_id) {
                    await Inventory.findOneAndUpdate(
                        { variant_id: detail.variant_id, location_id: detail.location_id },
                        { $inc: { quantity: detail.quantity } },
                        { session }
                    );
                }

                await StockMovement.create([{
                    variant_id: detail.variant_id,
                    location_id: detail.location_id,
                    movement_type: 'IN',
                    quantity_change: detail.quantity,
                    quantity_before: 0,
                    quantity_after: detail.quantity,
                    reason: `Hoàn kho do hủy đơn #${order._id}`,
                    created_by: req.user._id
                }], { session });
            }

            if (order.voucher_id) {
                await Voucher.findByIdAndUpdate(
                    order.voucher_id,
                    { $inc: { used_count: -1 }, $pull: { used_by: order.user_id } },
                    { session }
                );
            }

            if (order.customer_id) {
                await Customer.findByIdAndUpdate(
                    order.customer_id,
                    { $inc: { total_spending: -order.total_price } },
                    { session }
                );
            }
        }

        order.status = status;
        await order.save({ session });
        await session.commitTransaction();

        res.json({ success: true, message: `Đơn hàng đã chuyển sang "${status}"`, data: order });
    } catch (err) {
        await session.abortTransaction();
        console.error('[ORDER] updateOrderStatus error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    } finally {
        session.endSession();
    }
};

// ─── 7. THÊM THANH TOÁN ──────────────────────────────────────────────────────
exports.addPayment = async (req, res) => {
    try {
        const { method, amount, transaction_id } = req.body;
        if (!method || !amount) {
            return res.status(400).json({ success: false, message: 'Thiếu phương thức hoặc số tiền' });
        }

        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        if (order.status === 'Cancelled') {
            return res.status(400).json({ success: false, message: 'Không thể thêm thanh toán cho đơn đã hủy' });
        }

        order.payments.push({ method, amount, transaction_id, payment_date: new Date() });
        await order.save();

        res.json({ success: true, message: 'Đã ghi nhận thanh toán', data: order });
    } catch (err) {
        console.error('[ORDER] addPayment error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

// ─── 8. THỐNG KÊ DOANH THU ───────────────────────────────────────────────────
exports.getRevenueStats = async (req, res) => {
    try {
        const { from_date, to_date } = req.query;
        const matchStage = { order_type: 'OUT', status: 'Completed' };
        if (from_date || to_date) {
            matchStage.createdAt = {};
            if (from_date) matchStage.createdAt.$gte = new Date(from_date);
            if (to_date) matchStage.createdAt.$lte = new Date(to_date);
        }

        const stats = await Order.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    daily_revenue: { $sum: '$total_price' },
                    order_count: { $sum: 1 },
                    avg_order_value: { $avg: '$total_price' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const totalRevenue = stats.reduce((sum, s) => sum + s.daily_revenue, 0);
        const totalOrders = stats.reduce((sum, s) => sum + s.order_count, 0);

        res.json({
            success: true,
            data: {
                total_revenue: totalRevenue,
                total_orders: totalOrders,
                avg_order_value: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
                daily: stats
            }
        });
    } catch (err) {
        console.error('[ORDER] getRevenueStats error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

exports.cancelMyOrder = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const order = await Order.findById(req.params.id).session(session);
 
        if (!order) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }
 
        // Chỉ được hủy đơn của chính mình
        if (order.user_id?.toString() !== req.user._id.toString()) {
            await session.abortTransaction();
            return res.status(403).json({ success: false, message: 'Không có quyền hủy đơn hàng này' });
        }
 
        // Chỉ hủy được đơn Draft (chưa hoàn thành)
        if (order.status !== 'Draft') {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: `Không thể hủy đơn hàng đã "${order.status}"`
            });
        }
 
        // Hoàn lại tồn kho
        for (const detail of order.details) {
            await ProductVariant.findByIdAndUpdate(
                detail.variant_id,
                { $inc: { stock_quantity: detail.quantity } },
                { session }
            );
 
            if (detail.location_id) {
                await Inventory.findOneAndUpdate(
                    { variant_id: detail.variant_id, location_id: detail.location_id },
                    { $inc: { quantity: detail.quantity } },
                    { session }
                );
            }
 
            await StockMovement.create([{
                variant_id:      detail.variant_id,
                location_id:     detail.location_id,
                movement_type:   'IN',
                quantity_change: detail.quantity,
                quantity_before: 0,
                quantity_after:  detail.quantity,
                reason:          `Hoàn kho do khách hủy đơn MoMo #${order._id}`,
                created_by:      req.user._id
            }], { session });
        }
 
        // Hoàn voucher nếu có
        if (order.voucher_id) {
            await Voucher.findByIdAndUpdate(
                order.voucher_id,
                { $inc: { used_count: -1 }, $pull: { used_by: order.user_id } },
                { session }
            );
        }
 
        // Hoàn tổng chi tiêu
        if (order.customer_id) {
            await Customer.findByIdAndUpdate(
                order.customer_id,
                { $inc: { total_spending: -order.total_price } },
                { session }
            );
        }
 
        order.status = 'Cancelled';
        await order.save({ session });
        await session.commitTransaction();
 
        res.json({ success: true, message: 'Đã hủy đơn hàng và hoàn kho' });
    } catch (err) {
        await session.abortTransaction();
        console.error('[ORDER] cancelMyOrder error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    } finally {
        session.endSession();
    }
};