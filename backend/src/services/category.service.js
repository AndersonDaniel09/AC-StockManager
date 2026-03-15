const prisma = require('../config/prisma');

const PROTECTED_FREE_SALE_CATEGORY_NAME = 'Venta de varios productos';

function normalizeCategoryName(name) {
  return String(name || '').trim().toLowerCase();
}

async function ensureProtectedCategories() {
  const existing = await prisma.category.findFirst({
    where: { name: PROTECTED_FREE_SALE_CATEGORY_NAME },
    select: { id: true },
  });

  if (existing) return;

  await prisma.category.create({
    data: { name: PROTECTED_FREE_SALE_CATEGORY_NAME, imageUrl: null },
  });
}

async function getAll() {
  await ensureProtectedCategories();
  return prisma.category.findMany({ orderBy: { name: 'asc' } });
}

async function create(data) {
  return prisma.category.create({ data: { name: data.name, imageUrl: data.imageUrl } });
}

async function update(id, data) {
  const current = await prisma.category.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!current) {
    throw new Error('Categoría no encontrada');
  }

  if (normalizeCategoryName(current.name) === normalizeCategoryName(PROTECTED_FREE_SALE_CATEGORY_NAME)) {
    return prisma.category.update({
      where: { id },
      data: { imageUrl: data.imageUrl },
    });
  }

  return prisma.category.update({ where: { id }, data: { name: data.name, imageUrl: data.imageUrl } });
}

async function remove(id) {
  const current = await prisma.category.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!current) {
    throw new Error('Categoría no encontrada');
  }

  if (normalizeCategoryName(current.name) === normalizeCategoryName(PROTECTED_FREE_SALE_CATEGORY_NAME)) {
    throw new Error('La categoría "Venta de varios productos" está protegida y no se puede eliminar');
  }

  return prisma.category.delete({ where: { id } });
}

module.exports = { getAll, create, update, remove, ensureProtectedCategories, PROTECTED_FREE_SALE_CATEGORY_NAME };
