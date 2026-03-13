const express = require('express');
const router = express.Router();
const saleController = require('../controllers/sale.controller');
const { authenticate, requireCanSell } = require('../middlewares/auth.middleware');

router.get('/', authenticate, requireCanSell, saleController.getAll);
router.get('/:id', authenticate, requireCanSell, saleController.getOne);
router.post('/', authenticate, requireCanSell, saleController.create);

module.exports = router;
