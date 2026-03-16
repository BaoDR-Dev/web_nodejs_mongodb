const Category = require('../models/Category');

// 1. Thêm Category
exports.createCategory = async (req, res) => {
    try {
        const { name, parent_id } = req.body;
        const newCategory = new Category({ name, parent_id });
        await newCategory.save();
        res.status(201).json({ message: "Thêm thành công!", data: newCategory });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. Lấy tất cả & Tìm kiếm
exports.getCategories = async (req, res) => {
    try {
        const { search } = req.query;
        let query = {};
        
        // Logic tìm kiếm theo tên (không phân biệt hoa thường)
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        const categories = await Category.find(query).populate('parent_id', 'name');
        res.status(200).json(categories);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. Sửa Category
exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedCategory = await Category.findByIdAndUpdate(id, req.body, { new: true });
        res.status(200).json({ message: "Cập nhật thành công!", data: updatedCategory });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Ví dụ logic trong categoryController.js
exports.deleteCategory = async (req, res) => {
    const categoryId = req.params.id;
    
    // Kiểm tra xem có sản phẩm nào đang dùng Category này không
    const productCount = await Product.countDocuments({ category_id: categoryId });
    if (productCount > 0) {
        return res.status(400).json({ 
            message: "Không thể xóa! Danh mục này đang chứa " + productCount + " sản phẩm." 
        });
    }

    // Nếu không có sản phẩm nào mới tiến hành xóa
    await Category.findByIdAndDelete(categoryId);
    res.status(200).json({ message: "Xóa danh mục thành công" });
};

// [GET] /api/categories/:id - LẤY CHI TIẾT THEO ID
exports.getCategoryById = async (req, res) => {
    try {
        // Dùng .populate('parent_id') để biết danh mục này thuộc danh mục cha nào
        const category = await Category.findById(req.params.id).populate('parent_id', 'name');
        
        if (!category) {
            return res.status(404).json({ 
                success: false, 
                message: "Không tìm thấy danh mục này!" 
            });
        }

        res.status(200).json({ 
            success: true, 
            data: category 
        });
    } catch (err) {
        res.status(400).json({ 
            success: false, 
            error: "ID không hợp lệ hoặc lỗi server" 
        });
    }
};