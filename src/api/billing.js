import api from './axios';

export const getBills = () => api.get('/billing');
export const getBill = (id) => api.get(`/billing/${id}`);
export const createBill = (data) => api.post('/billing', data);
export const updateBill = (id, data) => api.put(`/billing/${id}`, data);
export const deleteBill = (id) => api.delete(`/billing/${id}`);
