const creditService = require('../services/credit.service');

async function getAll(req, res) {
  try {
    const credits = await creditService.getAll(req.user, req.query.branchId);
    res.json(credits);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function getOne(req, res) {
  try {
    const credit = await creditService.getOne(Number(req.params.id), req.user, req.query.branchId);
    if (!credit) return res.status(404).json({ message: 'Fiado no encontrado' });
    res.json(credit);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function create(req, res) {
  try {
    const credit = await creditService.create(req.body, req.user.id, req.user);
    res.status(201).json(credit);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

async function updateStatus(req, res) {
  try {
    const credit = await creditService.updateStatus(Number(req.params.id), req.body.status);
    res.json(credit);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

module.exports = { getAll, getOne, create, updateStatus };
