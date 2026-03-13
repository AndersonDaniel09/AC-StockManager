const branchService = require('../services/branch.service');

async function getAll(req, res) {
  try {
    const branches = await branchService.getAll();
    res.json(branches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function create(req, res) {
  try {
    const branch = await branchService.create(req.body);
    res.status(201).json(branch);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

async function update(req, res) {
  try {
    const branch = await branchService.update(Number(req.params.id), req.body);
    res.json(branch);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

async function remove(req, res) {
  try {
    await branchService.remove(Number(req.params.id));
    res.json({ message: 'Sede eliminada' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

module.exports = { getAll, create, update, remove };
