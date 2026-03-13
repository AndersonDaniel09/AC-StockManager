const saleService = require('../services/sale.service');

async function getAll(req, res) {
  try {
    const sales = await saleService.getAll(req.user, req.query.branchId);
    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function getOne(req, res) {
  try {
    const sale = await saleService.getOne(Number(req.params.id), req.user, req.query.branchId);
    if (!sale) return res.status(404).json({ message: 'Venta no encontrada' });
    res.json(sale);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function create(req, res) {
  try {
    const sale = await saleService.create(req.body, req.user.id, req.user);
    res.status(201).json(sale);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

module.exports = { getAll, getOne, create };
