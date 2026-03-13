const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { authenticate, requireCanEditProducts } = require('../middlewares/auth.middleware');

router.get('/', authenticate, productController.getAll);
router.get('/category/:categoryId', authenticate, productController.getByCategory);
router.get('/low-stock', authenticate, productController.getLowStock);
router.get('/:id', authenticate, productController.getOne);
router.post('/', authenticate, requireCanEditProducts, productController.create);
router.put('/:id', authenticate, requireCanEditProducts, productController.update);
router.delete('/:id', authenticate, requireCanEditProducts, productController.remove);

module.exports = router;
