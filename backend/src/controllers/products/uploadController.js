const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Tạo signature để frontend upload thẳng lên Cloudinary (không qua multer)
exports.getSignature = (req, res) => {
    try {
        const timestamp = Math.round(Date.now() / 1000);
        const folder    = 'my_store/products';

        const signature = cloudinary.utils.api_sign_request(
            { timestamp, folder },
            process.env.CLOUDINARY_API_SECRET
        );

        res.json({
            success:    true,
            timestamp,
            signature,
            folder,
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key:    process.env.CLOUDINARY_API_KEY,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
