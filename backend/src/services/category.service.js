const prisma = require('../config/prisma');

async function getAll() {
  return prisma.category.findMany({ orderBy: { name: 'asc' } });
}

async function create(data) {
  return prisma.category.create({ data: { name: data.name, imageUrl: data.imageUrl } });
}

async function update(id, data) {
  return prisma.category.update({ where: { id }, data: { name: data.name, imageUrl: data.imageUrl } });
}

async function remove(id) {
  return prisma.category.delete({ where: { id } });
}

module.exports = { getAll, create, update, remove };
