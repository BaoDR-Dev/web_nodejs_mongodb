const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/ai/aiController');
const { protect } = require('../../middlewares/auth');

router.post('/chat', protect, ctrl.chat);
router.delete('/chat/:session_id', protect, ctrl.clearSession);

module.exports = router;
