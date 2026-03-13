const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');

router.post('/login', authController.login);
router.post('/register', authenticate, requireAdmin, authController.register);
router.post('/setup-password', authController.setupPassword);
router.get('/me', authenticate, authController.me);

module.exports = router;
