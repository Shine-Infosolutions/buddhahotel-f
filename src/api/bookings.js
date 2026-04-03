import api from './axios';

export const getBookings = () => api.get('/bookings');
export const getBooking = (id) => api.get(`/bookings/${id}`);
export const createBooking = (data) => api.post('/bookings', data);
export const updateBooking = (id, data) => api.put(`/bookings/${id}`, data);
export const deleteBooking = (id) => api.delete(`/bookings/${id}`);
export const checkAvailability = (params) => api.get('/bookings/check-availability', { params });
export const previewNumbers = (checkIn) => api.get('/bookings/preview-numbers', { params: { checkIn } });
export const searchGuestByQuery = (q) => api.get('/bookings/search-guest', { params: { q } });
export const getGuestByGRC = (grc) => api.get(`/bookings/grc/${grc}`);
