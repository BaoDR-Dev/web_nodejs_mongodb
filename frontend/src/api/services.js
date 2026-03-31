import api from './axios';

// ── AUTH ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  login:           (data) => api.post('/auth/login', data),
  logout:          ()     => api.post('/auth/logout'),
  getMe:           ()     => api.get('/auth/me'),
  forgotPassword:  (data) => api.post('/auth/forgot-password', data),
  verifyResetOtp:  (data) => api.post('/auth/verify-reset-otp', data),
  resetPassword:   (data) => api.post('/auth/reset-password', data),
  resendResetOtp:  (data) => api.post('/auth/resend-reset-otp', data),
};

// ── CUSTOMER REGISTER ─────────────────────────────────────────────────────────
export const customerAuthAPI = {
  register:    (data) => api.post('/customers/register', data),
  verifyOtp:   (data) => api.post('/customers/verify-otp', data),
  resendOtp:   (data) => api.post('/customers/resend-otp', data),
};

// ── PRODUCTS ──────────────────────────────────────────────────────────────────
export const productAPI = {
  getAll:          (params) => api.get('/products', { params }),
  getById:         (id)     => api.get(`/products/${id}`),
  create:          (data)   => api.post('/products', data),
  update:          (id, d)  => api.put(`/products/${id}`, d),
  delete:          (id)     => api.delete(`/products/${id}`),
  toggleStatus:    (id)     => api.patch(`/products/${id}/status`),
  addVariant:      (pid, d) => api.post(`/products/${pid}/variants`, d),
  updateVariant:   (vid, d) => api.put(`/products/variant/${vid}`, d),
  addImage:        (vid, d) => api.post(`/products/variants/${vid}/images`, d),
  setPrimaryImage: (iid)    => api.patch(`/products/images/${iid}/set-primary`),
  deleteImage:     (iid)    => api.delete(`/products/images/${iid}`),
};

// ── CATEGORIES ────────────────────────────────────────────────────────────────
export const categoryAPI = {
  getAll:   (params) => api.get('/categories', { params }),
  getById:  (id)     => api.get(`/categories/${id}`),
  create:   (data)   => api.post('/categories', data),
  update:   (id, d)  => api.put(`/categories/${id}`, d),
  delete:   (id)     => api.delete(`/categories/${id}`),
};

// ── BRANDS ────────────────────────────────────────────────────────────────────
export const brandAPI = {
  getAll:  (params) => api.get('/brands', { params }),
  getById: (id)     => api.get(`/brands/${id}`),
  create:  (data)   => api.post('/brands', data),
  update:  (id, d)  => api.put(`/brands/${id}`, d),
  delete:  (id)     => api.delete(`/brands/${id}`),
};

// ── ATTRIBUTES ────────────────────────────────────────────────────────────────
export const attributeAPI = {
  get:    (type)        => api.get(`/attributes/${type}`),
  create: (type, data)  => api.post(`/attributes/${type}`, data),
  update: (type, id, d) => api.put(`/attributes/${type}/${id}`, d),
  delete: (type, id)    => api.delete(`/attributes/${type}/${id}`),
};

// ── CART ──────────────────────────────────────────────────────────────────────
export const cartAPI = {
  get:        ()        => api.get('/cart'),
  count:      ()        => api.get('/cart/count'),
  add:        (data)    => api.post('/cart/add', data),
  update:     (id, d)   => api.put(`/cart/item/${id}`, d),
  remove:     (id)      => api.delete(`/cart/item/${id}`),
  clear:      ()        => api.delete('/cart/clear'),
};

// ── ORDERS ────────────────────────────────────────────────────────────────────
export const orderAPI = {
  create:        (data)     => api.post('/orders', data),
  myOrders:      (params)   => api.get('/orders/my-orders', { params }),
  getById:       (id)       => api.get(`/orders/${id}`),
  getAll:        (params)   => api.get('/orders', { params }),
  updateStatus:  (id, data) => api.patch(`/orders/${id}/status`, data),
  addPayment:    (id, data) => api.post(`/orders/${id}/payment`, data),
  import:        (data)     => api.post('/orders/import', data),
  revenueStats:  (params)   => api.get('/orders/stats/revenue', { params }),
};

// ── PAYMENT ───────────────────────────────────────────────────────────────────
export const paymentAPI = {
  createMomo:   (data) => api.post('/payment/momo/create', data),
  checkStatus:  (id)   => api.get(`/payment/momo/status/${id}`),
};

// ── VOUCHERS ──────────────────────────────────────────────────────────────────
export const voucherAPI = {
  getAll:   (params) => api.get('/vouchers', { params }),
  getStats: (id)     => api.get(`/vouchers/${id}/stats`),
  apply:    (data)   => api.post('/vouchers/apply', data),
  create:   (data)   => api.post('/vouchers', data),
  update:   (id, d)  => api.put(`/vouchers/${id}`, d),
  toggle:   (id)     => api.patch(`/vouchers/${id}/toggle`),
  delete:   (id)     => api.delete(`/vouchers/${id}`),
};

// ── CUSTOMERS ─────────────────────────────────────────────────────────────────
export const customerAPI = {
  getAll:      (params) => api.get('/customers', { params }),
  getById:     (id)     => api.get(`/customers/${id}`),
  getOrders:   (id)     => api.get(`/customers/${id}/orders`),
  update:      (id, d)  => api.put(`/customers/${id}`, d),
  delete:      (id)     => api.delete(`/customers/${id}`),
};

// ── REVIEWS ───────────────────────────────────────────────────────────────────
export const reviewAPI = {
  getByProduct: (pid, p) => api.get(`/reviews/product/${pid}`, { params: p }),
  getAll:       (params) => api.get('/reviews', { params }),
  create:       (data)   => api.post('/reviews', data),
  update:       (id, d)  => api.put(`/reviews/${id}`, d),
  delete:       (id)     => api.delete(`/reviews/${id}`),
  toggle:       (id)     => api.patch(`/reviews/${id}/toggle`),
};

// ── SHIPMENTS ─────────────────────────────────────────────────────────────────
export const shipmentAPI = {
  getAll:        (params)   => api.get('/shipments', { params }),
  getByOrder:    (oid)      => api.get(`/shipments/order/${oid}`),
  create:        (data)     => api.post('/shipments', data),
  update:        (id, data) => api.put(`/shipments/${id}`, data),
  updateStatus:  (id, data) => api.patch(`/shipments/${id}/status`, data),
};

// ── RETURNS ───────────────────────────────────────────────────────────────────
export const returnAPI = {
  create:      (data)     => api.post('/returns', data),
  getAll:      (params)   => api.get('/returns', { params }),
  getById:     (id)       => api.get(`/returns/${id}`),
  process:     (id, data) => api.patch(`/returns/${id}/process`, data),
  complete:    (id)       => api.patch(`/returns/${id}/complete`),
  getByCustomer: (cid)    => api.get(`/returns/customer/${cid}`),
};

// ── WAREHOUSES ────────────────────────────────────────────────────────────────
export const warehouseAPI = {
  getAll:  (params) => api.get('/warehouses', { params }),
  getById: (id)     => api.get(`/warehouses/${id}`),
  create:  (data)   => api.post('/warehouses', data),
  update:  (id, d)  => api.put(`/warehouses/${id}`, d),
  delete:  (id)     => api.delete(`/warehouses/${id}`),
};

// ── LOCATIONS ─────────────────────────────────────────────────────────────────
export const locationAPI = {
  getAll:  (params) => api.get('/locations', { params }),
  getById: (id)     => api.get(`/locations/${id}`),
  create:  (data)   => api.post('/locations', data),
  update:  (id, d)  => api.put(`/locations/${id}`, d),
  delete:  (id)     => api.delete(`/locations/${id}`),
};

// ── STOCK MOVEMENTS ───────────────────────────────────────────────────────────
export const stockAPI = {
  getAll:      (params) => api.get('/stock-movements', { params }),
  audit:       (params) => api.get('/stock-movements/audit', { params }),
  byVariant:   (vid, p) => api.get(`/stock-movements/variant/${vid}`, { params: p }),
  record:      (data)   => api.post('/stock-movements', data),
  transfer:    (data)   => api.post('/stock-movements/transfer', data),
};

// ── SUPPLIERS ─────────────────────────────────────────────────────────────────
export const supplierAPI = {
  getAll:    (params) => api.get('/suppliers', { params }),
  getStats:  ()       => api.get('/suppliers/stats'),
  getById:   (id)     => api.get(`/suppliers/${id}`),
  getOrders: (id, p)  => api.get(`/suppliers/${id}/orders`, { params: p }),
  create:    (data)   => api.post('/suppliers', data),
  update:    (id, d)  => api.put(`/suppliers/${id}`, d),
  toggle:    (id)     => api.patch(`/suppliers/${id}/toggle`),
  delete:    (id)     => api.delete(`/suppliers/${id}`),
};

// ── STAFF ─────────────────────────────────────────────────────────────────────
export const staffAPI = {
  getAll:  (params) => api.get('/staffs', { params }),
  getById: (id)     => api.get(`/staffs/${id}`),
  create:  (data)   => api.post('/staffs', data),
  update:  (id, d)  => api.put(`/staffs/${id}`, d),
  delete:  (id)     => api.delete(`/staffs/${id}`),
};

// ── USERS ─────────────────────────────────────────────────────────────────────
export const userAPI = {
  getAll:          (params) => api.get('/users', { params }),
  updateUsername:  (id, d)  => api.patch(`/users/${id}/username`, d),
  changePassword:  (id, d)  => api.put(`/users/${id}/password`, d),
  updateStatus:    (id, d)  => api.patch(`/users/${id}/status`, d),
  updateRole:      (id, d)  => api.patch(`/users/${id}/role`, d),
};

// ── ROLES ─────────────────────────────────────────────────────────────────────
export const roleAPI = {
  getAll:  () => api.get('/roles'),
  create:  (d) => api.post('/roles', d),
  update:  (id, d) => api.put(`/roles/${id}`, d),
  delete:  (id) => api.delete(`/roles/${id}`),
};

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
export const notificationAPI = {
  getAll:       (params) => api.get('/notifications', { params }),
  markRead:     (id)     => api.put(`/notifications/${id}/read`),
  markAllRead:  ()       => api.put('/notifications/read-all'),
  delete:       (id)     => api.delete(`/notifications/${id}`),
  clearRead:    ()       => api.delete('/notifications/clear-read'),
  sendToUser:   (data)   => api.post('/notifications/send', data),
  broadcast:    (data)   => api.post('/notifications/broadcast', data),
};

// ── AI CHAT ───────────────────────────────────────────────────────────────────
export const aiAPI = {
  chat:         (data) => api.post('/ai/chat', data),
  clearSession: (id)   => api.delete(`/ai/chat/${id}`),
};
