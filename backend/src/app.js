const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const categoryRoutes = require('./routes/category.routes');
const productRoutes = require('./routes/product.routes');
const saleRoutes = require('./routes/sale.routes');
const creditRoutes = require('./routes/credit.routes');
const userRoutes = require('./routes/user.routes');
const branchRoutes = require('./routes/branch.routes');
const customerRoutes = require('./routes/customer.routes');
const { ensureDefaultBranches } = require('./services/branch.service');

const app = express();

app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/credits', creditRoutes);
app.use('/api/users', userRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/customers', customerRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'AC StockManager API funcionando' });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
ensureDefaultBranches()
  .catch((error) => {
    console.error('Error inicializando sedes por defecto:', error.message);
  })
  .finally(() => {
    app.listen(PORT, HOST, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
      console.log(`Servidor LAN en http://<TU_IP_LOCAL>:${PORT}`);
    });
  });

module.exports = app;
