const Brand = require('../../models/products/Brand');

// [GET] /api/brands/:id - GET BY ID
exports.getBrandById = async (req, res) => {
    try {
        const brand = await Brand.findById(req.params.id);
        
        if (!brand) {
            return res.status(404).json({ 
                success: false, 
                message: "Không tìm thấy thương hiệu này!" 
            });
        }

        res.status(200).json({ 
            success: true, 
            data: brand 
        });
    } catch (err) {
        // Trường hợp ID sai định dạng (không đủ ký tự...)
        res.status(400).json({ 
            success: false, 
            error: "ID không hợp lệ hoặc lỗi hệ thống" 
        });
    }
};

// [GET] /api/brands - LIST & SEARCH
exports.listBrands = async (req, res) => {
    try {
        const { search } = req.query;
        let filter = {};

        if (search) {
            filter.name = { $regex: search, $options: 'i' }; // Tìm theo tên
        }

        const brands = await Brand.find(filter).sort({ name: 1 });
        res.status(200).json({ success: true, count: brands.length, data: brands });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// [POST] /api/brands - CREATE
exports.createBrand = async (req, res) => {
    try {
        const newBrand = await Brand.create(req.body);
        res.status(201).json({ success: true, data: newBrand });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// [PUT] /api/brands/:id - UPDATE
exports.updateBrand = async (req, res) => {
    try {
        const brand = await Brand.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!brand) return res.status(404).json({ success: false, message: "Không tìm thấy thương hiệu" });
        res.status(200).json({ success: true, data: brand });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// [DELETE] /api/brands/:id - DELETE
exports.deleteBrand = async (req, res) => {
    try {
        const brand = await Brand.findByIdAndDelete(req.params.id);
        if (!brand) return res.status(404).json({ success: false, message: "Không tìm thấy thương hiệu" });
        res.status(200).json({ success: true, message: "Xóa thương hiệu thành công" });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};