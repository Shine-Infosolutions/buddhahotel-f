import api from './axios';

export const getBills = () => api.get('/billing');
export const getBill = (id) => api.get(`/billing/${id}`);
export const getBillByBooking = (bookingId) => api.get(`/billing/booking/${bookingId}`);
export const getInvoiceByBooking = (bookingId) => api.get(`/billing/invoice/${bookingId}`);
export const createBill = (data) => api.post('/billing', data);
export const updateBill = (id, data) => api.put(`/billing/${id}`, data);
export const deleteBill = (id) => api.delete(`/billing/${id}`);
