const Location = require('../models/Location');

// 1. TẠO MỚI (CREATE)
exports.createLocation = async (req, res) => {
    try {
        const { warehouse_id, location_name, description, status } = req.body;
        const newLocation = new Location({ 
            warehouse_id, 
            location_name, 
            description,
            status: status || 'Active' // Mặc định là Active nếu không truyền
        });
        await newLocation.save();
        res.status(201).json({ success: true, data: newLocation });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 2. LIỆT KÊ & TÌM KIẾM NÂNG CAO (SEARCH - Hỗ trợ tìm kiếm kép)
exports.listLocations = async (req, res) => {
    try {
        const { warehouse_id, name, status } = req.query;
        let filter = {};

        // Lọc theo Kho hàng
        if (warehouse_id) filter.warehouse_id = warehouse_id;

        // TÌM KIẾM KÉP: Tên Vị Trí & Trạng Thái
        if (name) filter.location_name = { $regex: name, $options: 'i' };
        if (status) filter.status = status; // Ví dụ: 'Active', 'Full', 'Maintenance'

        const locations = await Location.find(filter)
            .populate('warehouse_id', 'warehouse_name address')
            .sort({ location_name: 1 }); // Sắp xếp theo tên A-Z

        res.status(200).json({ 
            success: true, 
            count: locations.length, 
            data: locations 
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 3. LẤY CHI TIẾT (GET BY ID)
exports.getLocationById = async (req, res) => {
    try {
        const location = await Location.findById(req.params.id).populate('warehouse_id');
        if (!location) return res.status(404).json({ success: false, message: "Không tìm thấy vị trí này" });
        res.status(200).json({ success: true, data: location });
    } catch (err) {
        res.status(400).json({ success: false, error: "ID không hợp lệ" });
    }
};

// 4. CHỈNH SỬA (UPDATE)
exports.updateLocation = async (req, res) => {
    try {
        const updatedLocation = await Location.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true, runValidators: true }
        );
        
        if (!updatedLocation) return res.status(404).json({ success: false, message: "Không tìm thấy vị trí" });
        
        res.status(200).json({ success: true, data: updatedLocation });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// Ví dụ logic trong locationController.js
exports.deleteLocation = async (req, res) => {
    const locationId = req.params.id;
    
    // Giả sử bạn có Model Product có trường location_id
    const Product = require('../models/Product');
    const isOccupied = await Product.findOne({ location_id: locationId });
    
    if (isOccupied) {
        return res.status(400).json({ 
            success: false, 
            message: "Không thể xóa vị trí này vì vẫn còn sản phẩm đang được lưu trữ tại đây!" 
        });
    }

    await Location.findByIdAndDelete(locationId);
    res.status(200).json({ success: true, message: "Xóa vị trí thành công" });
};