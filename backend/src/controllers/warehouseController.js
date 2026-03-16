const Warehouse = require('../models/Warehouse');

// 1. Tạo kho mới
exports.createWarehouse = async (req, res) => {
    try {
        const { warehouse_name, address, capacity, manager_id } = req.body;
        const newWarehouse = new Warehouse({ warehouse_name, address, capacity, manager_id });
        await newWarehouse.save();
        res.status(201).json({ success: true, data: newWarehouse });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 2. Lấy danh sách kho & Tìm kiếm
exports.listWarehouses = async (req, res) => {
    try {
        const { name, address } = req.query;
        let filter = {};
        if (name) filter.warehouse_name = { $regex: name, $options: 'i' };
        if (address) filter.address = { $regex: address, $options: 'i' };

        const warehouses = await Warehouse.find(filter).populate('manager_id', 'full_name phone');
        res.status(200).json({ success: true, data: warehouses });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 3. Cập nhật thông tin kho (Sức chứa, tên, quản lý)
exports.updateWarehouse = async (req, res) => {
    try {
        const updated = await Warehouse.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({ success: true, data: updated });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// 4. Lấy chi tiết 1 kho (Cần thiết để xem kỹ thông tin)
exports.getWarehouseById = async (req, res) => {
    try {
        const warehouse = await Warehouse.findById(req.params.id)
            .populate('manager_id', 'full_name phone position');
        
        if (!warehouse) {
            return res.status(404).json({ success: false, message: "Không tìm thấy kho hàng" });
        }
        res.status(200).json({ success: true, data: warehouse });
    } catch (err) {
        res.status(400).json({ success: false, error: "ID không hợp lệ" });
    }
};

// 5. Xóa kho hàng
exports.deleteWarehouse = async (req, res) => {
    try {
        const warehouse = await Warehouse.findById(req.params.id);
        if (!warehouse) {
            return res.status(404).json({ success: false, message: "Không tìm thấy kho để xóa" });
        }

        // Logic nâng cao (tùy chọn): Kiểm tra xem kho có còn hàng không trước khi xóa
        const inventoryCount = await Inventory.countDocuments({ warehouse_id: req.params.id });
        if (inventoryCount > 0) return res.status(400).json({ message: "Không thể xóa kho đang còn hàng!" });

        await Warehouse.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "Đã xóa kho hàng thành công" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};