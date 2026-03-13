import api from './api';

export const getProducts = (branchId) => api.get('/products', { params: { branchId } });
export const getProductsByCategory = (categoryId, branchId) => api.get(`/products/category/${categoryId}`, { params: { branchId } });
export const getProduct = (id, branchId) => api.get(`/products/${id}`, { params: { branchId } });
export const createProduct = (data) => api.post('/products', data);
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);
export const deleteProduct = (id, branchId) => api.delete(`/products/${id}`, { params: { branchId } });
export const getLowStockProducts = (branchId, threshold = 3) =>
	api.get('/products/low-stock', { params: { branchId, threshold } });
