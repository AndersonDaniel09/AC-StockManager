import api from './api';

export const getCredits = (branchId) => api.get('/credits', { params: { branchId } });
export const createCredit = (data) => api.post('/credits', data);
export const updateCreditStatus = (id, status) => api.patch(`/credits/${id}/status`, { status });
