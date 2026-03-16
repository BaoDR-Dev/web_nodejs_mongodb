const P_Image = require('../models/ProductImage');
const cloudinary = require('cloudinary').v2; // Cần thêm dòng này

// 1. Thêm ảnh thủ công bằng URL (Link ngoài)
exports.addImage = async (req, res) => {
    try {
        const { variantId } = req.params;
        const { image_url, is_primary } = req.body;

        if (is_primary) {
            await P_Image.updateMany({ variant_id: variantId }, { is_primary: false });
        }

        const newImg = await P_Image.create({ variant_id: variantId, image_url, is_primary });
        res.status(201).json({ success: true, data: newImg });
    } catch (error) {
        console.error("Error in addImage:", error);
        res.status(400).json({ error: error.message });
    }
};

// 2. Upload ảnh trực tiếp lên Cloudinary và lưu vào DB
exports.uploadAndAddImage = async (req, res) => {
    try {
        const { variantId } = req.params;
        const { is_primary } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: "Chưa có file ảnh nào!" });
        }

        const imageUrl = req.file.path;

        // XỬ LÝ LOGIC ẢNH CHÍNH: Nếu ảnh này là primary, các ảnh cũ của variant này phải thành false
        if (is_primary === 'true') {
            await P_Image.updateMany({ variant_id: variantId }, { is_primary: false });
        }

        const newImg = await P_Image.create({
            variant_id: variantId,
            image_url: imageUrl,
            is_primary: is_primary === 'true'
        });

        res.status(201).json({ success: true, data: newImg });
    } catch (error) {
        console.error("Error in uploadAndAddImage:", error);
        res.status(500).json({ error: error.message });
    }
};

// 3. Đặt một ảnh làm ảnh chính
exports.setPrimaryImage = async (req, res) => {
    try {
        const { id } = req.params;
        const targetImg = await P_Image.findById(id);
        if (!targetImg) return res.status(404).json({ message: "Không tìm thấy ảnh" });
        
        await P_Image.updateMany({ variant_id: targetImg.variant_id }, { is_primary: false });
        
        targetImg.is_primary = true;
        await targetImg.save();

        res.json({ success: true, message: "Đã đổi ảnh đại diện" });
    } catch (error) {
        console.error("Error in setPrimaryImage:", error);
        res.status(400).json({ error: error.message });
    }
};

// 4. Xóa ảnh (Xóa cả DB và trên Cloudinary)
exports.deleteImage = async (req, res) => {
    try {
        const { id } = req.params;
        const image = await P_Image.findById(id);
        if (!image) return res.status(404).json({ message: "Ảnh không tồn tại" });

        try {
            // --- BỔ SUNG: XÓA ẢNH TRÊN CLOUDINARY ---
            // Lấy public_id từ URL (ví dụ: http://.../folder/abc.jpg -> folder/abc)
            const urlParts = image.image_url.split('/');
            const fileName = urlParts[urlParts.length - 1].split('.')[0];
            const folderName = urlParts[urlParts.length - 2];
            const publicId = `${folderName}/${fileName}`;

            await cloudinary.uploader.destroy(publicId);
            console.log("Đã xóa ảnh trên Cloudinary:", publicId);
        } catch (cloudinaryError) {
            console.error("Lỗi khi xóa ảnh trên Cloudinary:", cloudinaryError);
        }

        await P_Image.findByIdAndDelete(id);
        res.json({ success: true, message: "Đã xóa ảnh ở DB và Cloudinary" });
    } catch (error) {
        console.error("Error in deleteImage:", error);
        res.status(400).json({ error: error.message });
    }
};