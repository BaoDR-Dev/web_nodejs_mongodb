const Category = require('../../models/products/Category');
const Product = require('../../models/products/Product');

// ─── 1. TẠO CATEGORY ─────────────────────────────────────────────────────────
exports.createCategory = async (req, res) => {
    try {
        const { name, parent_id } = req.body;
        if (!name?.trim()) {
            return res.status(400).json({ success: false, message: 'Tên danh mục không được để trống' });
        }

        // Nếu có parent_id thì kiểm tra tồn tại
        if (parent_id) {
            const parent = await Category.findById(parent_id);
            if (!parent) return res.status(404).json({ success: false, message: 'Danh mục cha không tồn tại' });
        }

        const newCategory = await Category.create({ name: name.trim(), parent_id: parent_id || null });
        res.status(201).json({ success: true, data: newCategory });
    } catch (err) {
        console.error('[CATEGORY] createCategory error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

// ─── 2. DANH SÁCH & TÌM KIẾM ─────────────────────────────────────────────────
exports.getCategories = async (req, res) => {
    try {
        const { search } = req.query;
        let query = {};
        if (search) query.name = { $regex: search, $options: 'i' };

        const categories = await Category.find(query).populate('parent_id', 'name');
        res.json({ success: true, count: categories.length, data: categories });
    } catch (err) {
        console.error('[CATEGORY] getCategories error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

// ─── 3. CHI TIẾT CATEGORY ────────────────────────────────────────────────────
exports.getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id).populate('parent_id', 'name');
        if (!category) return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
        res.json({ success: true, data: category });
    } catch (err) {
        console.error('[CATEGORY] getCategoryById error:', err.message);
        res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    }
};

// ─── 4. CẬP NHẬT CATEGORY ────────────────────────────────────────────────────
exports.updateCategory = async (req, res) => {
    try {
        const { name, parent_id } = req.body;
        const updateData = {};
        if (name) updateData.name = name.trim();
        if (parent_id !== undefined) updateData.parent_id = parent_id;

        const updated = await Category.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
        if (!updated) return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });

        res.json({ success: true, data: updated });
    } catch (err) {
        console.error('[CATEGORY] updateCategory error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

// ─── 5. XÓA CATEGORY ─────────────────────────────────────────────────────────
// FIX MEDIUM: Thêm try/catch và kiểm tra đúng model
exports.deleteCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;

        const category = await Category.findById(categoryId);
        if (!category) return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });

        // Kiểm tra danh mục có sản phẩm không
        const productCount = await Product.countDocuments({ category_id: categoryId });
        if (productCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Không thể xóa! Danh mục đang chứa ${productCount} sản phẩm.`
            });
        }

        // Kiểm tra có danh mục con không
        const childCount = await Category.countDocuments({ parent_id: categoryId });
        if (childCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Không thể xóa! Danh mục đang có ${childCount} danh mục con.`
            });
        }

        await Category.findByIdAndDelete(categoryId);
        res.json({ success: true, message: 'Xóa danh mục thành công' });
    } catch (err) {
        console.error('[CATEGORY] deleteCategory error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};
