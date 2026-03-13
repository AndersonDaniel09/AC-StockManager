const express = require('express');
const router = express.Router();
const creditController = require('../controllers/credit.controller');
const { authenticate, requireCanSell } = require('../middlewares/auth.middleware');

router.get('/', authenticate, requireCanSell, creditController.getAll);
router.get('/:id', authenticate, requireCanSell, creditController.getOne);
router.post('/', authenticate, requireCanSell, creditController.create);
router.patch('/:id/status', authenticate, requireCanSell, creditController.updateStatus);

module.exports = router;
