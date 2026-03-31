const Location = require('../../models/warehouse/Location');
const Inventory = require('../../models/warehouse/Inventory');

// ─── 1. TẠO MỚI ──────────────────────────────────────────────────────────────
exports.createLocation = async (req, res) => {
    try {
        const { warehouse_id, location_name, description, status } = req.body;
        if (!warehouse_id || !location_name?.trim()) {
            return res.status(400).json({ success: false, message: 'Thiếu warehouse_id hoặc location_name' });
        }

        const newLocation = await Location.create({
            warehouse_id, location_name: location_name.trim(), description, status: status || 'Active'
        });
        res.status(201).json({ success: true, data: newLocation });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ success: false, message: 'Tên kệ đã tồn tại trong kho này' });
        }
        console.error('[LOCATION] createLocation error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

// ─── 2. DANH SÁCH ─────────────────────────────────────────────────────────────
exports.listLocations = async (req, res) => {
    try {
        const { warehouse_id, name, status } = req.query;
        let filter = {};
        if (warehouse_id) filter.warehouse_id = warehouse_id;
        if (name) filter.location_name = { $regex: name, $options: 'i' };
        if (status) filter.status = status;

        const locations = await Location.find(filter)
            .populate('warehouse_id', 'warehouse_name address')
            .sort({ location_name: 1 });

        res.json({ success: true, count: locations.length, data: locations });
    } catch (err) {
        console.error('[LOCATION] listLocations error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

// ─── 3. CHI TIẾT ─────────────────────────────────────────────────────────────
exports.getLocationById = async (req, res) => {
    try {
        const location = await Location.findById(req.params.id).populate('warehouse_id');
        if (!location) return res.status(404).json({ success: false, message: 'Không tìm thấy vị trí này' });
        res.json({ success: true, data: location });
    } catch (err) {
        console.error('[LOCATION] getLocationById error:', err.message);
        res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    }
};

// ─── 4. CẬP NHẬT ─────────────────────────────────────────────────────────────
exports.updateLocation = async (req, res) => {
    try {
        const { location_name, description, status } = req.body;
        const allowedUpdate = {};
        if (location_name) allowedUpdate.location_name = location_name.trim();
        if (description !== undefined) allowedUpdate.description = description;
        if (status) allowedUpdate.status = status;

        const updated = await Location.findByIdAndUpdate(
            req.params.id, allowedUpdate, { new: true, runValidators: true }
        );
        if (!updated) return res.status(404).json({ success: false, message: 'Không tìm thấy vị trí' });
        res.json({ success: true, data: updated });
    } catch (err) {
        console.error('[LOCATION] updateLocation error:', err.message);
        res.status(400).json({ success: false, message: err.message });
    }
};

// ─── 5. XÓA ──────────────────────────────────────────────────────────────────
// FIX MEDIUM: Kiểm tra đúng model Inventory thay vì Product
exports.deleteLocation = async (req, res) => {
    try {
        const locationId = req.params.id;

        const location = await Location.findById(locationId);
        if (!location) return res.status(404).json({ success: false, message: 'Không tìm thấy vị trí' });

        // FIX: Kiểm tra Inventory (đúng model) thay vì Product
        const inventoryCount = await Inventory.countDocuments({ location_id: locationId, quantity: { $gt: 0 } });
        if (inventoryCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Không thể xóa! Vị trí này đang lưu ${inventoryCount} loại sản phẩm.`
            });
        }

        // Xóa inventory records rỗng liên quan
        await Inventory.deleteMany({ location_id: locationId });
        await Location.findByIdAndDelete(locationId);

        res.json({ success: true, message: 'Xóa vị trí thành công' });
    } catch (err) {
        console.error('[LOCATION] deleteLocation error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};
