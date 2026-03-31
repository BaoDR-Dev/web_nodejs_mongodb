const Product = require('../../models/products/Product');
const ProductVariant = require('../../models/products/ProductVariant');
const P_Image = require('../../models/products/ProductImage');
const Inventory = require('../../models/warehouse/Inventory');
const mongoose = require('mongoose');

// ─── 1. TẠO SẢN PHẨM MỚI (Kèm Variant, Ảnh, Kho) ───────────────────────────
exports.createFullProduct = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { product, variants } = req.body;
        if (!product?.name || !product?.sku) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin sản phẩm (name, sku)' });
        }

        const newPro = await Product.create([product], { session });
        const productId = newPro[0]._id;

        if (variants?.length > 0) {
            for (const v of variants) {
                if (!v.sku || v.price == null) {
                    await session.abortTransaction();
                    return res.status(400).json({ success: false, message: 'Mỗi variant cần có sku và price' });
                }

                const newVar = await ProductVariant.create([{ ...v, product_id: productId }], { session });
                const variantId = newVar[0]._id;

                if (v.images?.length > 0) {
                    const imgs = v.images.map(img => ({ ...img, variant_id: variantId }));
                    await P_Image.insertMany(imgs, { session });
                }

                if (v.initial_location_id) {
                    await Inventory.create([{
                        variant_id: variantId,
                        location_id: v.initial_location_id,
                        quantity: v.stock_quantity || 0
                    }], { session });
                }
            }
        }

        await session.commitTransaction();
        res.status(201).json({ success: true, message: `Đã tạo sản phẩm "${product.name}" thành công.` });
    } catch (error) {
        await session.abortTransaction();
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'SKU đã tồn tại trong hệ thống' });
        }
        console.error('[PRODUCT] createFullProduct error:', error.message);
        res.status(400).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
};

// ─── 2. TÌM KIẾM SẢN PHẨM ───────────────────────────────────────────────────
// FIX HIGH: Xóa N+1 query — gom tất cả variant và image bằng $in
exports.searchProducts = async (req, res) => {
    try {
        const { search, category, brand, minPrice, maxPrice, color, size, page = 1, limit = 10 } = req.query;

        let productQuery = {};
        if (search) productQuery.name = { $regex: search, $options: 'i' };
        if (category) productQuery.category_id = category;
        if (brand) productQuery.brand_id = brand;

        // Lọc theo thuộc tính variant
        let variantQuery = {};
        if (minPrice || maxPrice) {
            variantQuery.price = {};
            if (minPrice) variantQuery.price.$gte = Number(minPrice);
            if (maxPrice) variantQuery.price.$lte = Number(maxPrice);
        }
        if (color) variantQuery.color_id = color;
        if (size) variantQuery.size_id = size;

        if (Object.keys(variantQuery).length > 0) {
            const matchedVars = await ProductVariant.find(variantQuery).select('product_id').lean();
            const pIds = [...new Set(matchedVars.map(v => v.product_id.toString()))];
            productQuery._id = { $in: pIds };
        }

        const skip = (Number(page) - 1) * Number(limit);
        const [products, total] = await Promise.all([
            Product.find(productQuery)
                .populate('category_id', 'name')
                .populate('brand_id', 'name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            Product.countDocuments(productQuery)
        ]);

        const productIds = products.map(p => p._id);

        // FIX: Batch query — 1 query lấy tất cả variants, 1 query lấy tất cả ảnh
        const allVariants = await ProductVariant.find({ product_id: { $in: productIds } })
            .populate('color_id', 'color_name hex_code')
            .populate('size_id', 'size_name')
            .populate('type_id', 'type_name')
            .lean();

        const variantIds = allVariants.map(v => v._id);
        const primaryImages = await P_Image.find({ variant_id: { $in: variantIds }, is_primary: true }).lean();

        // Map nhanh bằng Map thay vì find() trong loop
        const variantsByProduct = {};
        allVariants.forEach(v => {
            const pid = v.product_id.toString();
            if (!variantsByProduct[pid]) variantsByProduct[pid] = [];
            variantsByProduct[pid].push(v);
        });

        const imageByVariant = {};
        primaryImages.forEach(img => { imageByVariant[img.variant_id.toString()] = img.image_url; });

        const fullData = products.map(p => {
            const variants = variantsByProduct[p._id.toString()] || [];
            const firstVariantId = variants[0]?._id?.toString();
            return { ...p, variants, image: firstVariantId ? imageByVariant[firstVariantId] : null };
        });

        res.json({ success: true, total, page: Number(page), data: fullData });
    } catch (error) {
        console.error('[PRODUCT] searchProducts error:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

// ─── 3. CHI TIẾT SẢN PHẨM ───────────────────────────────────────────────────
exports.getProductDetails = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('category_id', 'name')
            .populate('brand_id', 'name origin');
        if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });

        const variants = await ProductVariant.find({ product_id: product._id })
            .populate('color_id', 'color_name hex_code')
            .populate('size_id', 'size_name')
            .populate('type_id', 'type_name')
            .lean();

        const variantIds = variants.map(v => v._id);
        const allImages = await P_Image.find({ variant_id: { $in: variantIds } }).lean();

        const imagesByVariant = {};
        allImages.forEach(img => {
            const vid = img.variant_id.toString();
            if (!imagesByVariant[vid]) imagesByVariant[vid] = [];
            imagesByVariant[vid].push(img);
        });

        const detailedVariants = variants.map(v => ({
            ...v,
            images: imagesByVariant[v._id.toString()] || []
        }));

        res.json({ success: true, data: { ...product._doc, variants: detailedVariants } });
    } catch (err) {
        console.error('[PRODUCT] getProductDetails error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

// ─── 4. CẬP NHẬT THÔNG TIN SẢN PHẨM ─────────────────────────────────────────
// FIX MEDIUM: Whitelist các field được phép sửa
exports.updateProductInfo = async (req, res) => {
    try {
        const { name, description, category_id, brand_id, unit } = req.body;
        const allowedUpdate = {};
        if (name !== undefined) allowedUpdate.name = name;
        if (description !== undefined) allowedUpdate.description = description;
        if (category_id !== undefined) allowedUpdate.category_id = category_id;
        if (brand_id !== undefined) allowedUpdate.brand_id = brand_id;
        if (unit !== undefined) allowedUpdate.unit = unit;

        if (Object.keys(allowedUpdate).length === 0) {
            return res.status(400).json({ success: false, message: 'Không có dữ liệu cần cập nhật' });
        }

        const updated = await Product.findByIdAndUpdate(req.params.id, allowedUpdate, { new: true, runValidators: true });
        if (!updated) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });

        res.json({ success: true, data: updated });
    } catch (error) {
        console.error('[PRODUCT] updateProductInfo error:', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
};

// ─── 5. THÊM VARIANT MỚI VÀO SẢN PHẨM ───────────────────────────────────────
exports.addVariantToProduct = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { productId } = req.params;
        const variantData = req.body;

        if (!variantData.sku || variantData.price == null) {
            return res.status(400).json({ success: false, message: 'Variant cần có sku và price' });
        }

        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });

        const newVar = await ProductVariant.create([{ ...variantData, product_id: productId }], { session });

        if (variantData.images?.length > 0) {
            const imgs = variantData.images.map(img => ({ ...img, variant_id: newVar[0]._id }));
            await P_Image.insertMany(imgs, { session });
        }

        await session.commitTransaction();
        res.status(201).json({ success: true, data: newVar[0] });
    } catch (error) {
        await session.abortTransaction();
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'SKU variant đã tồn tại' });
        }
        console.error('[PRODUCT] addVariantToProduct error:', error.message);
        res.status(400).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
};

// ─── 6. CẬP NHẬT VARIANT ────────────────────────────────────────────────────
exports.updateVariant = async (req, res) => {
    try {
        const { price, color_id, size_id, type_id } = req.body;
        const allowedUpdate = {};
        if (price !== undefined) allowedUpdate.price = price;
        if (color_id !== undefined) allowedUpdate.color_id = color_id;
        if (size_id !== undefined) allowedUpdate.size_id = size_id;
        if (type_id !== undefined) allowedUpdate.type_id = type_id;

        const updated = await ProductVariant.findByIdAndUpdate(
            req.params.variantId,
            allowedUpdate,
            { new: true, runValidators: true }
        );
        if (!updated) return res.status(404).json({ success: false, message: 'Không tìm thấy variant' });
        res.json({ success: true, data: updated });
    } catch (error) {
        console.error('[PRODUCT] updateVariant error:', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
};

// ─── 7. ĐỔI TRẠNG THÁI ──────────────────────────────────────────────────────
// FIX HIGH: Kiểm tra null trước khi truy cập .status
exports.toggleStatus = async (req, res) => {
    try {
        const pro = await Product.findById(req.params.id);
        if (!pro) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });

        pro.status = pro.status === 'Active' ? 'Inactive' : 'Active';
        await pro.save();
        res.json({ success: true, status: pro.status });
    } catch (error) {
        console.error('[PRODUCT] toggleStatus error:', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
};

// ─── 8. XÓA SẢN PHẨM (Cascade) ──────────────────────────────────────────────
exports.deleteProduct = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const productId = req.params.id;

        const product = await Product.findById(productId).session(session);
        if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });

        const variants = await ProductVariant.find({ product_id: productId }).session(session);
        const variantIds = variants.map(v => v._id);

        await Inventory.deleteMany({ variant_id: { $in: variantIds } }, { session });
        await P_Image.deleteMany({ variant_id: { $in: variantIds } }, { session });
        await ProductVariant.deleteMany({ product_id: productId }, { session });
        await Product.findByIdAndDelete(productId, { session });

        await session.commitTransaction();
        res.json({ success: true, message: 'Đã xóa toàn bộ sản phẩm và dữ liệu liên quan.' });
    } catch (error) {
        await session.abortTransaction();
        console.error('[PRODUCT] deleteProduct error:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    } finally {
        session.endSession();
    }
};
