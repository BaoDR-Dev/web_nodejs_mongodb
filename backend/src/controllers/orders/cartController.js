const Cart = require('../../models/orders/Cart');
const ProductVariant = require('../../models/products/ProductVariant');
const ProductImage = require('../../models/products/ProductImage');

// Helper: lấy cart đầy đủ thông tin (chỉ item chưa xóa mềm)
const getPopulatedCart = async (user_id) => {
    return await Cart.findOne({ user_id }).populate({
        path: 'items.variant_id',
        populate: [
            { path: 'product_id', select: 'name sku' },
            { path: 'color_id',   select: 'color_name hex_code' },
            { path: 'size_id',    select: 'size_name' },
            { path: 'type_id',    select: 'type_name' }
        ]
    });
};

// ─── 1. LẤY GIỎ HÀNG (chỉ item chưa bị xóa mềm) ────────────────────────────
exports.getCart = async (req, res) => {
    try {
        const cart = await getPopulatedCart(req.user._id);
        if (!cart) return res.json({ success: true, data: { items: [], total: 0, count: 0 } });

        // Chỉ lấy item chưa xóa mềm
        const activeItems = cart.items.filter(i => !i.is_deleted);

        const variantIds = activeItems.map(i => i.variant_id?._id).filter(Boolean);
        const images = await ProductImage.find({
            variant_id: { $in: variantIds },
            is_primary: true
        });
        const imageMap = {};
        images.forEach(img => { imageMap[img.variant_id.toString()] = img.image_url; });

        let total = 0;
        let selectedTotal = 0;

        const items = activeItems.map((item) => {
            const variant = item.variant_id;
            const subtotal = (variant?.price || 0) * item.quantity;
            total += subtotal;
            if (item.is_selected) selectedTotal += subtotal;

            return {
                _id:         item._id,
                variant,
                quantity:    item.quantity,
                is_selected: item.is_selected,
                unit_price:  variant?.price || 0,
                subtotal,
                image_url:   imageMap[variant?._id?.toString()] || null,
                in_stock:    (variant?.stock_quantity || 0) >= item.quantity
            };
        });

        res.json({
            success: true,
            data: {
                items,
                total,
                selected_total: selectedTotal,
                count: items.length,
                selected_count: items.filter(i => i.is_selected).length
            }
        });
    } catch (err) {
        console.error('[CART] getCart error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

// ─── 2. THÊM SẢN PHẨM VÀO GIỎ ───────────────────────────────────────────────
exports.addToCart = async (req, res) => {
    try {
        const { variant_id, quantity = 1 } = req.body;

        if (!variant_id) return res.status(400).json({ success: false, message: 'Thiếu variant_id' });
        if (!Number.isInteger(Number(quantity)) || quantity < 1) {
            return res.status(400).json({ success: false, message: 'Số lượng không hợp lệ' });
        }

        const variant = await ProductVariant.findById(variant_id);
        if (!variant) return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });
        if (variant.stock_quantity <= 0) {
            return res.status(400).json({ success: false, message: 'Sản phẩm đã hết hàng' });
        }

        let cart = await Cart.findOne({ user_id: req.user._id });

        if (!cart) {
            cart = await Cart.create({
                user_id: req.user._id,
                items: [{ variant_id, quantity, is_selected: true, is_deleted: false }]
            });
        } else {
            // Tìm item kể cả đã xóa mềm
            const idx = cart.items.findIndex(i => i.variant_id.toString() === variant_id);

            if (idx >= 0) {
                // Nếu item đã bị xóa mềm → khôi phục lại
                if (cart.items[idx].is_deleted) {
                    cart.items[idx].is_deleted  = false;
                    cart.items[idx].is_selected = true;
                    cart.items[idx].quantity    = Number(quantity);
                } else {
                    // Kiểm tra tồn kho
                    const newQty = cart.items[idx].quantity + Number(quantity);
                    if (newQty > variant.stock_quantity) {
                        return res.status(400).json({
                            success: false,
                            message: `Không đủ hàng. Tồn kho: ${variant.stock_quantity}, giỏ đang có: ${cart.items[idx].quantity}`
                        });
                    }
                    cart.items[idx].quantity = newQty;
                }
            } else {
                cart.items.push({ variant_id, quantity: Number(quantity), is_selected: true, is_deleted: false });
            }
            await cart.save();
        }

        const populated = await getPopulatedCart(req.user._id);
        res.status(201).json({ success: true, message: 'Đã thêm vào giỏ hàng', data: populated });
    } catch (err) {
        console.error('[CART] addToCart error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

// ─── 3. CẬP NHẬT SỐ LƯỢNG ────────────────────────────────────────────────────
exports.updateCartItem = async (req, res) => {
    try {
        const { item_id } = req.params;
        const { quantity } = req.body;

        if (!quantity || !Number.isInteger(Number(quantity)) || quantity < 1) {
            return res.status(400).json({ success: false, message: 'Số lượng phải là số nguyên lớn hơn 0' });
        }

        const cart = await Cart.findOne({ user_id: req.user._id });
        if (!cart) return res.status(404).json({ success: false, message: 'Giỏ hàng trống' });

        const item = cart.items.id(item_id);
        if (!item || item.is_deleted) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm trong giỏ' });
        }

        const variant = await ProductVariant.findById(item.variant_id);
        if (!variant) return res.status(404).json({ success: false, message: 'Sản phẩm không còn tồn tại' });
        if (quantity > variant.stock_quantity) {
            return res.status(400).json({
                success: false,
                message: `Chỉ còn ${variant.stock_quantity} sản phẩm trong kho`
            });
        }

        item.quantity = Number(quantity);
        await cart.save();

        const populated = await getPopulatedCart(req.user._id);
        res.json({ success: true, message: 'Đã cập nhật giỏ hàng', data: populated });
    } catch (err) {
        console.error('[CART] updateCartItem error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

// ─── 4. TOGGLE CHỌN SẢN PHẨM ─────────────────────────────────────────────────
exports.toggleSelectItem = async (req, res) => {
    try {
        const { item_id } = req.params;

        const cart = await Cart.findOne({ user_id: req.user._id });
        if (!cart) return res.status(404).json({ success: false, message: 'Giỏ hàng trống' });

        const item = cart.items.id(item_id);
        if (!item || item.is_deleted) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm trong giỏ' });
        }

        item.is_selected = !item.is_selected;
        await cart.save();

        res.json({ success: true, message: `Đã ${item.is_selected ? 'chọn' : 'bỏ chọn'} sản phẩm`, data: { is_selected: item.is_selected } });
    } catch (err) {
        console.error('[CART] toggleSelectItem error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

// ─── 5. CHỌN / BỎ CHỌN TẤT CẢ ───────────────────────────────────────────────
exports.selectAll = async (req, res) => {
    try {
        const { selected } = req.body; // true hoặc false

        const cart = await Cart.findOne({ user_id: req.user._id });
        if (!cart) return res.status(404).json({ success: false, message: 'Giỏ hàng trống' });

        cart.items.forEach(item => {
            if (!item.is_deleted) item.is_selected = Boolean(selected);
        });
        await cart.save();

        res.json({ success: true, message: selected ? 'Đã chọn tất cả' : 'Đã bỏ chọn tất cả' });
    } catch (err) {
        console.error('[CART] selectAll error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

// ─── 6. XÓA MỀM 1 SẢN PHẨM ──────────────────────────────────────────────────
exports.removeCartItem = async (req, res) => {
    try {
        const { item_id } = req.params;

        const cart = await Cart.findOne({ user_id: req.user._id });
        if (!cart) return res.status(404).json({ success: false, message: 'Giỏ hàng trống' });

        const item = cart.items.id(item_id);
        if (!item) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm trong giỏ' });

        item.is_deleted = true;
        await cart.save();

        const populated = await getPopulatedCart(req.user._id);
        res.json({ success: true, message: 'Đã xóa sản phẩm khỏi giỏ hàng', data: populated });
    } catch (err) {
        console.error('[CART] removeCartItem error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

// ─── 7. XÓA CỨNG 1 SẢN PHẨM (xóa hẳn khỏi DB) ──────────────────────────────
exports.hardDeleteCartItem = async (req, res) => {
    try {
        const { item_id } = req.params;

        const cart = await Cart.findOne({ user_id: req.user._id });
        if (!cart) return res.status(404).json({ success: false, message: 'Giỏ hàng trống' });

        cart.items = cart.items.filter(i => i._id.toString() !== item_id);
        await cart.save();

        const populated = await getPopulatedCart(req.user._id);
        res.json({ success: true, message: 'Đã xóa sản phẩm', data: populated });
    } catch (err) {
        console.error('[CART] hardDeleteCartItem error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

// ─── 8. XÓA TOÀN BỘ GIỎ HÀNG (xóa mềm tất cả) ──────────────────────────────
exports.clearCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user_id: req.user._id });
        if (cart) {
            cart.items.forEach(item => { item.is_deleted = true; });
            await cart.save();
        }
        res.json({ success: true, message: 'Đã xóa toàn bộ giỏ hàng' });
    } catch (err) {
        console.error('[CART] clearCart error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

// ─── 9. ĐẾM SỐ LƯỢNG TRONG GIỎ (chỉ item active + selected) ─────────────────
exports.getCartCount = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user_id: req.user._id }).select('items');
        const count = cart
            ? cart.items
                .filter(i => !i.is_deleted)
                .reduce((sum, i) => sum + i.quantity, 0)
            : 0;
        res.json({ success: true, count });
    } catch (err) {
        console.error('[CART] getCartCount error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

// ─── 10. LẤY ITEM ĐÃ CHỌN (dùng khi checkout) ───────────────────────────────
exports.getSelectedItems = async (req, res) => {
    try {
        const cart = await getPopulatedCart(req.user._id);
        if (!cart) return res.json({ success: true, data: [] });

        const variantIds = cart.items.map(i => i.variant_id?._id).filter(Boolean);
        const images = await ProductImage.find({ variant_id: { $in: variantIds }, is_primary: true });
        const imageMap = {};
        images.forEach(img => { imageMap[img.variant_id.toString()] = img.image_url; });

        const selectedItems = cart.items
            .filter(i => !i.is_deleted && i.is_selected)
            .map(item => {
                const variant = item.variant_id;
                return {
                    _id:        item._id,
                    variant,
                    quantity:   item.quantity,
                    unit_price: variant?.price || 0,
                    subtotal:   (variant?.price || 0) * item.quantity,
                    image_url:  imageMap[variant?._id?.toString()] || null
                };
            });

        const total = selectedItems.reduce((sum, i) => sum + i.subtotal, 0);
        res.json({ success: true, data: selectedItems, total });
    } catch (err) {
        console.error('[CART] getSelectedItems error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};