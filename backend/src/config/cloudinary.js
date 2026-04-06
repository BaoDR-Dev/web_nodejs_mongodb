const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const Category = require('../models/products/Category');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        let folderName = 'products';
        try {
            const categoryId = req.params.categoryId;
            if (categoryId && categoryId.length === 24) {
                const category = await Category.findById(categoryId);
                if (category) {
                    folderName = category.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_');
                }
            }
        } catch (err) {
            console.log("Cloudinary Config - Không tìm thấy Category, dùng folder mặc định");
        }

        return {
            folder: `my_store/${folderName}`,
            allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
            public_id: `${Date.now()}-${file.originalname.split('.')[0]}`
        };
    },
});

const uploadCloud = multer({ storage });
module.exports = uploadCloud;