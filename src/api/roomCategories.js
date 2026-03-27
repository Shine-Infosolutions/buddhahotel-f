import api from './axios';

export const getCategories = () => api.get('/room-categories');
export const getCategory = (id) => api.get(`/room-categories/${id}`);
export const createCategory = (data) => api.post('/room-categories', data);
export const updateCategory = (id, data) => api.put(`/room-categories/${id}`, data);
export const deleteCategory = (id) => api.delete(`/room-categories/${id}`);
