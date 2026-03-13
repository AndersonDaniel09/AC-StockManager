import api from './api';

export const getCustomers = (q) => api.get('/customers', { params: { q } });
export const createCustomer = (data) => api.post('/customers', data);
export const updateCustomer = (id, data) => api.patch(`/customers/${id}`, data);
export const getCustomerUpdateRequests = () => api.get('/customers/update-requests');
export const reviewCustomerUpdateRequest = (id, approve) =>
	api.patch(`/customers/update-requests/${id}/review`, { approve });
