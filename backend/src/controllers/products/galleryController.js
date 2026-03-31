const Gallery = require('../../models/products/Gallery'); // Bạn cần tạo Model này hoặc dùng bảng khác

exports.uploadToGallery = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Chưa có file ảnh nào!" });
        }

        // Lưu vào bảng Gallery (Chỉ cần URL và Category)
        const newImg = await Gallery.create({
            category_id: req.params.categoryId,
            image_url: req.file.path,
            public_id: req.file.filename
        });

        res.status(201).json({ success: true, data: newImg });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};