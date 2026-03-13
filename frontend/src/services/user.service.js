import api from './api';

export const getUsers = () => api.get('/users');
export const getUserSales = (id, branchId) => api.get(`/users/sales/${id}`, { params: { branchId } });
export const updateUser = (id, data) => api.patch(`/users/${id}`, data);
export const updateUserPermissions = (id, data) => api.patch(`/users/${id}/permissions`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);
