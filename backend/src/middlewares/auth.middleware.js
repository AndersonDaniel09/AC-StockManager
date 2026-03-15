const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token requerido' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Se requiere rol Admin' });
  }
  next();
}

async function requireAdminOrCanEdit(req, res, next) {
  if (req.user.role === 'ADMIN') return next();
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { canEditProducts: true } });
    if (!user || !user.canEditProducts) {
      return res.status(403).json({ message: 'No tienes permiso para gestionar usuarios' });
    }
    next();
  } catch {
    return res.status(500).json({ message: 'Error al verificar permisos' });
  }
}

// Checks LIVE permissions from DB so revoked permissions take effect immediately
async function requireCanEditProducts(req, res, next) {
  if (req.user.role === 'ADMIN') return next();
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { canEditProducts: true } });
    if (!user || !user.canEditProducts) {
      return res.status(403).json({ message: 'No tienes permiso para gestionar productos' });
    }
    next();
  } catch {
    return res.status(500).json({ message: 'Error al verificar permisos' });
  }
}

// Checks LIVE permissions from DB so revoked permissions take effect immediately
async function requireCanSell(req, res, next) {
  if (req.user.role === 'ADMIN') return next();
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { canSell: true } });
    if (!user || !user.canSell) {
      return res.status(403).json({ message: 'No tienes permiso para vender o gestionar fiados' });
    }
    next();
  } catch {
    return res.status(500).json({ message: 'Error al verificar permisos' });
  }
}

async function requireCanSellOrEdit(req, res, next) {
  if (req.user.role === 'ADMIN') return next();
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { canSell: true, canEditProducts: true } });
    if (!user || (!user.canSell && !user.canEditProducts)) {
      return res.status(403).json({ message: 'No tienes permisos para acceder a clientes' });
    }
    next();
  } catch {
    return res.status(500).json({ message: 'Error al verificar permisos' });
  }
}

module.exports = { authenticate, requireAdmin, requireAdminOrCanEdit, requireCanEditProducts, requireCanSell, requireCanSellOrEdit };
