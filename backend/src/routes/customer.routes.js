const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer.controller');
const { authenticate, requireAdmin, requireCanSell, requireCanEditProducts, requireCanSellOrEdit } = require('../middlewares/auth.middleware');

// Ruta pública: el huésped se registra sin login
router.post('/self-register', customerController.selfRegister);
router.get('/public-debt/:idNumber', customerController.getPublicDebtByIdNumber);

router.get('/', authenticate, requireCanSellOrEdit, customerController.getAll);
router.get('/deleted', authenticate, requireAdmin, customerController.getDeleted);
router.post('/', authenticate, requireCanSell, customerController.create);
router.patch('/:id/restore', authenticate, requireAdmin, customerController.restore);
router.patch('/:id', authenticate, requireCanEditProducts, customerController.update);
router.delete('/:id', authenticate, requireCanEditProducts, customerController.remove);
router.get('/update-requests', authenticate, requireCanEditProducts, customerController.getPendingUpdateRequests);
router.patch('/update-requests/:id/review', authenticate, requireCanEditProducts, customerController.reviewUpdateRequest);
router.get('/delete-requests', authenticate, requireAdmin, customerController.getPendingDeleteRequests);
router.patch('/delete-requests/:id/review', authenticate, requireAdmin, customerController.reviewDeleteRequest);

module.exports = router;
