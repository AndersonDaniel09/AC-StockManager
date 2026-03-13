import api from './api';

export const getSales = (branchId) => api.get('/sales', { params: { branchId } });
export const createSale = (data) => api.post('/sales', data);
