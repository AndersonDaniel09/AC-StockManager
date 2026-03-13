const authService = require('../services/auth.service');
const prisma = require('../config/prisma');

async function me(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        branchId: true,
        branch: { select: { name: true } },
        role: true,
        canSell: true,
        canEditProducts: true,
        canAddProducts: true,
      }
    });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({
      ...user,
      branchName: user.branch?.name ?? null,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function login(req, res) {
  try {
    const { username, password } = req.body;
    const result = await authService.login(username, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
}

async function register(req, res) {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

async function setupPassword(req, res) {
  try {
    const result = await authService.setupPassword(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

module.exports = { login, register, setupPassword, me };
