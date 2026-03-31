const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/auth/authController');
const { protect } = require('../../middlewares/auth');

router.post('/login',           ctrl.login);
router.post('/logout',          ctrl.logout);
router.get('/me',        protect, ctrl.getMe);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password',  ctrl.resetPassword);
router.post('/verify-reset-otp',  ctrl.verifyResetOtp);
router.post('/resend-reset-otp',  ctrl.resendResetOtp);
module.exports = router;
