import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
  withCredentials: true
});

// 1. Thêm Interceptor cho Request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// 2. Thêm Interceptor cho Response
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Nếu token hết hạn hoặc không có quyền (401)
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// 3. Chỉ Export MỘT lần ở cuối cùng
export default api;