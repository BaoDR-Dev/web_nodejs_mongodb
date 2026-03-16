const express = require('express');
const router = express.Router();
const warehouseController = require('../controllers/warehouseController');
const { protect, restrictTo } = require('../middlewares/auth');

// TẤT CẢ các thao tác với Kho hàng đều yêu cầu đăng nhập
router.use(protect);

// --- NHÓM 1: XEM THÔNG TIN (Admin, Manager, Staff) ---
// Nhân viên kho cần xem danh sách kho để biết mình đang làm việc tại đâu
router.get('/', 
    restrictTo('Admin', 'Manager', 'Staff'), 
    warehouseController.listWarehouses
);

router.get('/:id', 
    restrictTo('Admin', 'Manager', 'Staff'), 
    warehouseController.getWarehouseById
);

// --- NHÓM 2: QUẢN LÝ CẤU TRÚC KHO (Admin, Manager) ---
// Việc tạo mới hoặc sửa thông tin kho (địa chỉ, diện tích) chỉ dành cho cấp quản lý
router.post('/', 
    restrictTo('Admin', 'Manager'), 
    warehouseController.createWarehouse
);

router.put('/:id', 
    restrictTo('Admin', 'Manager'), 
    warehouseController.updateWarehouse
);

// --- NHÓM 3: XÓA KHO (Chỉ Admin) ---
// Hành động xóa kho cực kỳ nguy hiểm vì nó liên quan đến hàng tồn và vị trí (Location)
router.delete('/:id', 
    restrictTo('Admin'), 
    warehouseController.deleteWarehouse
);

module.exports = router;