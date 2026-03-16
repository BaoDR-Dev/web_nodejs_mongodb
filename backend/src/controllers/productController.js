const Product = require('../models/Product');
const ProductVariant = require('../models/ProductVariant');
const P_Image = require('../models/ProductImage');
const Inventory = require('../models/Inventory');
const mongoose = require('mongoose');

// --- 1. TẠO SẢN PHẨM MỚI (Kèm Variant, Ảnh và Khởi tạo Kho) ---
exports.createFullProduct = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { product, variants } = req.body;

        // 1. Tạo Product Cha
        const newPro = await Product.create([product], { session });
        const productId = newPro[0]._id;

        if (variants && variants.length > 0) {
            for (let v of variants) {
                // 2. Tạo từng Variant
                const newVar = await ProductVariant.create(
                    [{ ...v, product_id: productId }], 
                    { session }
                );
                const variantId = newVar[0]._id;

                // 3. Lưu hình ảnh cho từng Variant
                if (v.images && v.images.length > 0) {
                    const imgs = v.images.map(img => ({ 
                        ...img, 
                        variant_id: variantId 
                    }));
                    await P_Image.insertMany(imgs, { session });
                }

                // 4. Khởi tạo kho tại vị trí (Kệ) chỉ định
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
        res.status(201).json({ 
            success: true, 
            message: `Đã tạo sản phẩm "${product.name}" thành công.` 
        });
    } catch (error) {
        await session.abortTransaction();
        res.status(400).json({ success: false, error: error.message });
    } finally {
        session.endSession();
    }
};

// --- 2. TÌM KIẾM ĐA NĂNG (Nâng cấp lọc theo thuộc tính và giá) ---
exports.searchProducts = async (req, res) => {
    try {
        const { search, category, brand, minPrice, maxPrice, color, size, page = 1, limit = 10 } = req.query;
        
        let query = {};
        if (search) query.name = { $regex: search, $options: 'i' };
        if (category) query.category_id = category;
        if (brand) query.brand_id = brand;

        let varQuery = {};
        if (minPrice || maxPrice) {
            varQuery.price = {};
            if (minPrice) varQuery.price.$gte = Number(minPrice);
            if (maxPrice) varQuery.price.$lte = Number(maxPrice);
        }
        if (color) varQuery.color_id = color;
        if (size) varQuery.size_id = size;

        // Lọc Product ID từ bảng Variant trước
        if (Object.keys(varQuery).length > 0) {
            const matchedVar = await ProductVariant.find(varQuery).select('product_id');
            const pIds = matchedVar.map(v => v.product_id);
            query._id = { $in: pIds };
        }

        const products = await Product.find(query)
            .populate('category_id brand_id')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const fullData = await Promise.all(products.map(async (p) => {
            const vars = await ProductVariant.find({ product_id: p._id }).populate('color_id size_id type_id');
            const mainImage = await P_Image.findOne({ variant_id: vars[0]?._id, is_primary: true });
            return { ...p._doc, variants: vars, image: mainImage?.image_url };
        }));

        res.json({ success: true, data: fullData });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// --- 3. CẬP NHẬT THÔNG TIN CHUNG ---
exports.updateProductInfo = async (req, res) => {
    try {
        const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// --- 4. THÊM VARIANT MỚI VÀO SẢN PHẨM CÓ SẴN ---
exports.addVariantToProduct = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { productId } = req.params;
        const variantData = req.body;

        const product = await Product.findById(productId);
        if (!product) throw new Error("Sản phẩm không tồn tại");

        const newVar = await ProductVariant.create([{ ...variantData, product_id: productId }], { session });

        if (variantData.images && variantData.images.length > 0) {
            const imgs = variantData.images.map(img => ({ ...img, variant_id: newVar[0]._id }));
            await P_Image.insertMany(imgs, { session });
        }

        await session.commitTransaction();
        res.status(201).json({ success: true, data: newVar[0] });
    } catch (error) {
        await session.abortTransaction();
        res.status(400).json({ success: false, error: error.message });
    } finally { session.endSession(); }
};

// --- 5. ĐỔI TRẠNG THÁI ---
exports.toggleStatus = async (req, res) => {
    try {
        const pro = await Product.findById(req.params.id);
        pro.status = pro.status === 'Active' ? 'Inactive' : 'Active';
        await pro.save();
        res.json({ success: true, status: pro.status });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// --- 6. XÓA SẢN PHẨM (Xóa sạch Variant, Image, Inventory) ---
exports.deleteProduct = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const productId = req.params.id;
        const variants = await ProductVariant.find({ product_id: productId });
        const variantIds = variants.map(v => v._id);

        await Inventory.deleteMany({ variant_id: { $in: variantIds } }, { session });
        await P_Image.deleteMany({ variant_id: { $in: variantIds } }, { session });
        await ProductVariant.deleteMany({ product_id: productId }, { session });
        await Product.findByIdAndDelete(productId, { session });

        await session.commitTransaction();
        res.json({ success: true, message: "Đã xóa toàn bộ sản phẩm và dữ liệu liên quan." });
    } catch (error) {
        await session.abortTransaction();
        res.status(400).json({ error: error.message });
    } finally { session.endSession(); }
};

exports.updateVariant = async (req, res) => {
    try {
        const updated = await ProductVariant.findByIdAndUpdate(req.params.variantId, req.body, { new: true });
        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.getProductDetails = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('category_id brand_id');
        if (!product) return res.status(404).json({ message: "Không tìm thấy" });

        // Tìm tất cả biến thể của sản phẩm này
        const variants = await ProductVariant.find({ product_id: product._id })
            .populate('color_id size_id type_id');

        // Lấy ảnh cho từng biến thể
        const detailedVariants = await Promise.all(variants.map(async (v) => {
            const images = await P_Image.find({ variant_id: v._id });
            return { ...v._doc, images };
        }));

        res.status(200).json({ 
            success: true, 
            data: { ...product._doc, variants: detailedVariants } 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};