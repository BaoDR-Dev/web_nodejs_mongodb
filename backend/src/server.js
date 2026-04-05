require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// ── AUTH ─────────────────────────────────────────────────────────────────────
const authRoutes    = require('./routes/auth/authRoutes');
const userRoutes    = require('./routes/auth/userRoutes');
const roleRoutes    = require('./routes/auth/roleRoutes');
const staffRoutes   = require('./routes/auth/staffRoutes');

// ── PRODUCTS ─────────────────────────────────────────────────────────────────
const productRoutes   = require('./routes/products/productRoutes');
const brandRoutes     = require('./routes/products/brandRoutes');
const categoryRoutes  = require('./routes/products/categoryRoutes');
const attributeRoutes = require('./routes/products/attributeRoutes');

// ── ORDERS ───────────────────────────────────────────────────────────────────
const orderRoutes    = require('./routes/orders/orderRoutes');
const cartRoutes     = require('./routes/orders/cartRoutes');
const shipmentRoutes = require('./routes/orders/shipmentRoutes');
const returnRoutes   = require('./routes/orders/returnOrderRoutes');

// ── CUSTOMERS ─────────────────────────────────────────────────────────────────
const customerRoutes = require('./routes/customers/customerRoutes');
const reviewRoutes   = require('./routes/customers/reviewRoutes');

// ── WAREHOUSE ─────────────────────────────────────────────────────────────────
const warehouseRoutes     = require('./routes/warehouse/warehouseRoutes');
const locationRoutes      = require('./routes/warehouse/locationRoutes');
const stockMovementRoutes = require('./routes/warehouse/stockMovementRoutes');

// ── COMMON ───────────────────────────────────────────────────────────────────
const notificationRoutes = require('./routes/common/notificationRoutes');
const voucherRoutes      = require('./routes/common/voucherRoutes');

// ── SUPPLIERS ─────────────────────────────────────────────────────────────────
const supplierRoutes = require('./routes/suppliers/supplierRoutes');

// ── AI ────────────────────────────────────────────────────────────────────────
const aiRoutes = require('./routes/ai/aiRoutes');

// ── PAYMENT ───────────────────────────────────────────────────────────────────
const paymentRoutes = require('./routes/payment/paymentRoutes');

const app = express();
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5000'], // Thêm cả port 5000 nếu cần
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// ── MIDDLEWARE ────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map(o => o.trim().replace(/\/$/, ''));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── DATABASE ──────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/quan_ly_kho_fashion')
    .then(() => console.log('🚀 MongoDB Connected!'))
    .catch(err => console.log('❌ Lỗi kết nối DB:', err));

// ── ROUTES ────────────────────────────────────────────────────────────────────

// Auth & Users
app.use('/api/auth',   authRoutes);
app.use('/api/users',  userRoutes);
app.use('/api/roles',  roleRoutes);
app.use('/api/staffs', staffRoutes);

// Products
app.use('/api/products',   productRoutes);
app.use('/api/brands',     brandRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/attributes', attributeRoutes);

// Orders
app.use('/api/orders',    orderRoutes);
app.use('/api/cart',      cartRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/returns',   returnRoutes);

// Customers
app.use('/api/customers', customerRoutes);
app.use('/api/reviews',   reviewRoutes);

// Warehouse
app.use('/api/warehouses',      warehouseRoutes);
app.use('/api/locations',       locationRoutes);
app.use('/api/stock-movements', stockMovementRoutes);

// Common
app.use('/api/notifications', notificationRoutes);
app.use('/api/vouchers',      voucherRoutes);

// Suppliers
app.use('/api/suppliers', supplierRoutes);

// AI
app.use('/api/ai', aiRoutes);

// Payment
app.use('/api/payment', paymentRoutes);

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/', (req, res) => {
    res.json({ message: 'Fashion Store API đang hoạt động', version: '2.0.0' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('[ERROR]', err.message);
    res.status(500).json({ success: false, message: err.message || 'Lỗi máy chủ' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server đang chạy tại: http://localhost:${PORT}`);
});
