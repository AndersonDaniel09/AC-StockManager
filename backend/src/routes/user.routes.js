const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');

router.get('/', authenticate, requireAdmin, userController.getAll);
// Get sales for a specific user - must be before other /:id routes
router.get('/sales/:id', authenticate, requireAdmin, userController.getSales);
router.patch('/:id', authenticate, requireAdmin, userController.update);
router.patch('/:id/permissions', authenticate, requireAdmin, userController.updatePermissions);
router.delete('/:id', authenticate, requireAdmin, userController.remove);

module.exports = router;
