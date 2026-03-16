const express = require('express');
const router = express.Router();
const brandController = require('../controllers/brandController');
const { protect, restrictTo } = require('../middlewares/auth');

router.get('/', brandController.listBrands);
router.get('/:id', brandController.getBrandById);

router.use(protect);
router.post('/', restrictTo('Admin', 'Manager', 'Staff'), brandController.createBrand);
router.put('/:id', restrictTo('Admin', 'Manager', 'Staff'), brandController.updateBrand);
router.delete('/:id', restrictTo('Admin', 'Manager'), brandController.deleteBrand);

module.exports = router;