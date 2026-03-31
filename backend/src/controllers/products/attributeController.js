// controllers/attributeController.js
const { Color, Size, Type } = require('../../models/products/Attributes');

const models = { color: Color, size: Size, type: Type };

// Thêm mới
exports.createAttribute = async (req, res) => {
    try {
        const { attrType } = req.params; // 'color', 'size', 'type'
        const Model = models[attrType];
        if (!Model) return res.status(400).json({ message: "Loại thuộc tính không hợp lệ" });

        const newItem = await Model.create(req.body);
        res.status(201).json({ success: true, data: newItem });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Lấy danh sách (Có thể dùng cho tất cả mọi người)
exports.getAttributes = async (req, res) => {
    try {
        const { attrType } = req.params;
        const Model = models[attrType];
        const data = await Model.find();
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Cập nhật
exports.updateAttribute = async (req, res) => {
    try {
        const { attrType, id } = req.params;
        const Model = models[attrType];
        const updated = await Model.findByIdAndUpdate(id, req.body, { new: true });
        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Xóa (Lưu ý: Nên check xem có Variant nào đang dùng thuộc tính này không trước khi xóa)
exports.deleteAttribute = async (req, res) => {
    try {
        const { attrType, id } = req.params;
        await models[attrType].findByIdAndDelete(id);
        res.json({ success: true, message: "Đã xóa thành công" });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};