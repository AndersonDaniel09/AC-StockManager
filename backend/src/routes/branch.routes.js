const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branch.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');

router.get('/', authenticate, requireAdmin, branchController.getAll);
router.post('/', authenticate, requireAdmin, branchController.create);
router.put('/:id', authenticate, requireAdmin, branchController.update);
router.delete('/:id', authenticate, requireAdmin, branchController.remove);

module.exports = router;
