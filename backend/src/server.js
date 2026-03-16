require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
// const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
// Import Routes
const categoryRoutes = require('./routes/categoryRoutes');
const brandRoutes = require('./routes/brandRoutes');
const roleRoutes = require('./routes/roleRoutes');
const customerRoutes = require('./routes/customerRoutes');
const staffRoutes = require('./routes/staffRoutes');    
const warehouseRoutes = require('./routes/warehouseRoutes');
const locationRoutes = require('./routes/locationRoutes');
const userRoutes = require('./routes/userRoutes'); // Thêm route cho User
const productRoutes = require('./routes/productRoutes'); // Thêm route cho Product
const authRoutes = require('./routes/authRoutes'); // Thêm route cho Authentication 
const attributeRoutes = require('./routes/attributeRoutes'); // Thêm route cho Attribute
// dotenv.config();
const app = express();

// Middleware
app.use(cors()); // Cho phép Frontend truy cập
app.use(express.json()); // Đọc dữ liệu JSON từ request body

// Kết nối Database
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/quan_ly_kho_fashion')
    .then(() => console.log("🚀 MongoDB Connected!"))
    .catch(err => console.log("❌ Lỗi kết nối DB:", err));

// Sử dụng Routes
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/staffs', staffRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/users', userRoutes); // Sử dụng route cho User
app.use('/api/products', productRoutes); // Sử dụng route cho Product
app.use('/api/attributes', attributeRoutes); // Sử dụng route cho Attribute
app.use('/api/auth', authRoutes); // Sử dụng route cho Authentication   
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
// Route kiểm tra server
app.get('/', (req, res) => {
    res.send("API Quản lý kho đang hoạt động...");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server đang chạy tại: http://localhost:${PORT}`);
});