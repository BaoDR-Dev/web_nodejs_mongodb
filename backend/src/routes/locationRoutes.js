const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { protect, restrictTo } = require('../middlewares/auth');

// TẤT CẢ các thao tác với Location đều phải đăng nhập (Nội bộ)
router.use(protect);

// --- NHÓM 1: XEM DỮ LIỆU (Nhân viên, Quản lý, Admin) ---
// Staff cần xem để biết vị trí xếp hàng, Manager xem để điều phối
router.get('/', 
    restrictTo('Admin', 'Manager', 'Staff'), 
    locationController.listLocations
);

router.get('/:id', 
    restrictTo('Admin', 'Manager', 'Staff'), 
    locationController.getLocationById
);

// --- NHÓM 2: THAY ĐỔI CẤU TRÚC (Admin, Manager) ---
// Việc tạo mới hoặc sửa tên khu vực kho nên dành cho cấp quản lý
router.post('/', 
    restrictTo('Admin', 'Manager'), 
    locationController.createLocation
);

router.put('/:id', 
    restrictTo('Admin', 'Manager'), 
    locationController.updateLocation
);

// --- NHÓM 3: XÓA VỊ TRÍ (Chỉ Admin) ---
// Xóa một vị trí có thể gây lỗi nếu đang có hàng ở đó, nên chỉ Admin mới có quyền
router.delete('/:id', 
    restrictTo('Admin'), 
    locationController.deleteLocation
);

module.exports = router;