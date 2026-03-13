const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { authenticate, requireCanEditProducts } = require('../middlewares/auth.middleware');

router.get('/', authenticate, categoryController.getAll);
router.post('/', authenticate, requireCanEditProducts, categoryController.create);
router.put('/:id', authenticate, requireCanEditProducts, categoryController.update);
router.delete('/:id', authenticate, requireCanEditProducts, categoryController.remove);

module.exports = router;
