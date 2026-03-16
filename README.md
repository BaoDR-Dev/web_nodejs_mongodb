# DA_WEB - Quản Lý Kho Fashion

Monorepo với Backend (Node.js/Express) và Frontend (React)

## 📁 Cấu trúc

```
DA_WEB/
├── backend/          # API Server (Node.js + Express + MongoDB)
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middlewares/
│   │   ├── config/
│   │   └── server.js
│   ├── package.json
│   ├── .env
│   └── node_modules/
│
├── frontend/         # React App
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── node_modules/
│
└── README.md
```

## 🚀 Cách chạy

### Backend
```bash
cd backend
npm start
```
Server chạy tại: **http://localhost:5000**

### Frontend
```bash
cd frontend
npm start
```
App chạy tại: **http://localhost:3000**

## 📋 Yêu cầu

- Node.js v14+
- MongoDB

## ⚙️ Cấu hình Backend

Tạo file `.env` trong thư mục `backend/`:
```
MONGO_URI=mongodb://localhost:27017/quan_ly_kho_fashion
PORT=5000
```

## 📦 Cài đặt dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

## 🛠️ API Endpoints

- `/api/categories` - Danh mục
- `/api/brands` - Thương hiệu
- `/api/products` - Sản phẩm
- `/api/users` - Người dùng
- `/api/auth` - Xác thực
- `/api/warehouses` - Kho hàng
- ...

## 📝 Notes

- Backend và Frontend chạy độc lập
- Frontend cần cấu hình proxy API trong `package.json` hoặc `setupProxy.js`
