const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer.controller');
const { authenticate, requireCanSell, requireCanEditProducts, requireCanSellOrEdit } = require('../middlewares/auth.middleware');

// Ruta pública: el huésped se registra sin login
router.post('/self-register', customerController.selfRegister);

router.get('/', authenticate, requireCanSellOrEdit, customerController.getAll);
router.post('/', authenticate, requireCanSell, customerController.create);
router.patch('/:id', authenticate, requireCanEditProducts, customerController.update);
router.get('/update-requests', authenticate, requireCanEditProducts, customerController.getPendingUpdateRequests);
router.patch('/update-requests/:id/review', authenticate, requireCanEditProducts, customerController.reviewUpdateRequest);

module.exports = router;
