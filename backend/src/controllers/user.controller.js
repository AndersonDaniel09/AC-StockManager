const userService = require('../services/user.service');

async function getAll(req, res) {
  try {
    const users = await userService.getAll();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function updatePermissions(req, res) {
  try {
    const user = await userService.updatePermissions(Number(req.params.id), req.body);
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

async function update(req, res) {
  try {
    const user = await userService.update(Number(req.params.id), req.body);
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

async function remove(req, res) {
  try {
    await userService.remove(Number(req.params.id));
    res.json({ message: 'Usuario eliminado' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

async function getSales(req, res) {
  try {
    const sales = await userService.getSales(Number(req.params.id), req.query.branchId);
    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

module.exports = { getAll, update, updatePermissions, remove, getSales };
