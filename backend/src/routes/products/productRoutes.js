const express = require('express');
const router = express.Router();
const proCtrl = require('../../controllers/products/productController');
const imgCtrl = require('../../controllers/products/productImageController');
const galleryCtrl = require('../../controllers/products/galleryController');
const uploadCloud = require('../../config/cloudinary');
const { protect, restrictTo } = require('../../middlewares/auth');

// Định nghĩa nhóm quyền
const managerAdmin = restrictTo('Manager', 'Admin');

// ==========================================
// QUYỀN PUBLIC (Ai cũng xem được)
// ==========================================
router.get('/', proCtrl.searchProducts);
router.get('/:id', proCtrl.getProductDetails);

// ==========================================
// QUYỀN CẦN ĐĂNG NHẬP (protect)
// ==========================================
router.use(protect); 

// --- Quyền cho Staff, Manager, Admin ---
router.patch('/:id/status', restrictTo('Staff', 'Manager', 'Admin'), proCtrl.toggleStatus);

// --- Quyền CHỈ cho Manager và Admin ---

// 1. Quản lý Sản phẩm & Biến thể
router.post('/', managerAdmin, proCtrl.createFullProduct);
router.post('/:productId/variants', managerAdmin, proCtrl.addVariantToProduct);
router.put('/:id', managerAdmin, proCtrl.updateProductInfo);
router.put('/variant/:variantId', managerAdmin, proCtrl.updateVariant);
router.delete('/products/:id', managerAdmin, proCtrl.deleteProduct); // ĐÃ THÊM LẠI VÌ CÓ TRONG CTRL

// 2. Quản lý Ảnh của Biến thể (Image Management)
// Thêm ảnh bằng Link URL có sẵn
router.post('/variants/:variantId/images', managerAdmin, imgCtrl.addImage);

// Upload ảnh trực tiếp từ máy tính lên Cloudinary
router.post(
    '/variants/:variantId/images/upload', 
    managerAdmin, 
    uploadCloud.single('image'), 
    imgCtrl.uploadAndAddImage
);

// Đổi ảnh chính & Xóa ảnh
router.patch('/images/:id/set-primary', managerAdmin, imgCtrl.setPrimaryImage);
router.delete('/images/:id', managerAdmin, imgCtrl.deleteImage);
router.post(
    '/categories/:categoryId/upload', 
    protect, 
    managerAdmin, 
    uploadCloud.single('image'), 
    galleryCtrl.uploadToGallery
);

module.exports = router;