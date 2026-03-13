const productService = require('../services/product.service');

async function getAll(req, res) {
  try {
    const products = await productService.getAll(req.user, req.query.branchId);
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function getByCategory(req, res) {
  try {
    const products = await productService.getByCategory(Number(req.params.categoryId), req.user, req.query.branchId);
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function getOne(req, res) {
  try {
    const product = await productService.getOne(Number(req.params.id), req.user, req.query.branchId);
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function create(req, res) {
  try {
    const product = await productService.create(req.body, req.user);
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

async function update(req, res) {
  try {
    const product = await productService.update(Number(req.params.id), req.body, req.user);
    res.json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

async function remove(req, res) {
  try {
    await productService.remove(Number(req.params.id), req.user, req.query.branchId);
    res.json({ message: 'Producto eliminado' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

async function getLowStock(req, res) {
  try {
    const data = await productService.getLowStock(req.user, req.query.branchId, req.query.threshold);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

module.exports = { getAll, getByCategory, getOne, create, update, remove, getLowStock };
