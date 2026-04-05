const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/customers/customerController');
const { protect, restrictTo, checkCustomerAccess } = require('../../middlewares/auth');

router.use(protect);

// Sử dụng checkCustomerAccess thay vì checkPermission cũ
router.get('/:id',             checkCustomerAccess, ctrl.getCustomerById);
router.get('/:id/orders',      checkCustomerAccess, ctrl.getCustomerOrders);
router.put('/:id',             checkCustomerAccess, ctrl.updateCustomer);

// Các route quản trị giữ nguyên
router.get('/',                restrictTo('Admin', 'Manager'), ctrl.listCustomers);
router.patch('/:id/spending',  restrictTo('Admin', 'Manager'), ctrl.updateSpending);
router.delete('/:id',          restrictTo('Admin'),            ctrl.deleteCustomer);
router.post('/',               restrictTo('Admin', 'Manager', 'Staff'), ctrl.createCustomer);

module.exports = router;