import api from './api';

export const getCustomers = (q) => api.get('/customers', { params: { q } });
export const getDeletedCustomers = (q) => api.get('/customers/deleted', { params: { q } });
export const createCustomer = (data) => api.post('/customers', data);
export const updateCustomer = (id, data) => api.patch(`/customers/${id}`, data);
export const deleteCustomer = (id) => api.delete(`/customers/${id}`);
export const restoreCustomer = (id) => api.patch(`/customers/${id}/restore`);
export const getCustomerUpdateRequests = () => api.get('/customers/update-requests');
export const reviewCustomerUpdateRequest = (id, approve) =>
	api.patch(`/customers/update-requests/${id}/review`, { approve });
export const getCustomerDeleteRequests = () => api.get('/customers/delete-requests');
export const reviewCustomerDeleteRequest = (id, approve) =>
	api.patch(`/customers/delete-requests/${id}/review`, { approve });
