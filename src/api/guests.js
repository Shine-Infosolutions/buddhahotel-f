import api from './axios';

export const getGuests = () => api.get('/guests');
export const getGuest = (id) => api.get(`/guests/${id}`);
export const createGuest = (data) => api.post('/guests', data);
export const updateGuest = (id, data) => api.put(`/guests/${id}`, data);
export const deleteGuest = (id) => api.delete(`/guests/${id}`);
