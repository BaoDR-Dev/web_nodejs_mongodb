const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/suppliers/supplierController');
const { protect, restrictTo } = require('../../middlewares/auth');

router.use(protect);

const staffUp      = restrictTo('Admin', 'Manager', 'Staff');
const managerAdmin = restrictTo('Admin', 'Manager');

router.get('/',                   staffUp,                ctrl.listSuppliers);
router.get('/stats',              managerAdmin,           ctrl.getSupplierStats);
router.get('/:id',                staffUp,                ctrl.getSupplierById);
router.get('/:id/orders',         staffUp,                ctrl.getSupplierOrders);
router.post('/',                  managerAdmin,           ctrl.createSupplier);
router.put('/:id',                managerAdmin,           ctrl.updateSupplier);
router.patch('/:id/toggle',       managerAdmin,           ctrl.toggleSupplier);
router.delete('/:id',             restrictTo('Admin'),    ctrl.deleteSupplier);

module.exports = router;
