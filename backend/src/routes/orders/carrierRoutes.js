const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/orders/carrierController');
const { protect, restrictTo } = require('../../middlewares/auth');

router.get('/', ctrl.getAll); // Public — ai cũng xem được

router.use(protect);
router.post('/',         restrictTo('Admin', 'Manager'), ctrl.create);
router.put('/:id',       restrictTo('Admin', 'Manager'), ctrl.update);
router.delete('/:id',    restrictTo('Admin', 'Manager'), ctrl.remove);
router.patch('/:id/toggle', restrictTo('Admin', 'Manager'), ctrl.toggle);

module.exports = router;
