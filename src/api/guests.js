import api from './axios';

export const getGuests = () => api.get('/guests');
export const getGuest = (id) => api.get(`/guests/${id}`);
export const createGuest = (data) => {
  const formData = new FormData();
  Object.keys(data).forEach(key => {
    if (key === 'guestPhoto') {
      if (data[key] instanceof File) formData.append(key, data[key]);
    } else if (key === 'idProofPhotos') {
      if (Array.isArray(data[key])) {
        data[key].forEach(file => {
          if (file instanceof File) formData.append('idProofPhotos', file);
        });
      }
    } else {
      formData.append(key, data[key]);
    }
  });
  return api.post('/guests', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const updateGuest = (id, data) => {
  const formData = new FormData();
  Object.keys(data).forEach(key => {
    if (key === 'guestPhoto') {
      if (data[key] instanceof File) formData.append(key, data[key]);
    } else if (key === 'idProofPhotos') {
      if (Array.isArray(data[key])) {
        data[key].forEach(file => {
          if (file instanceof File) formData.append('idProofPhotos', file);
        });
      }
    } else if (key === 'existingIdProofPhotos') {
      formData.append(key, JSON.stringify(data[key]));
    } else {
      formData.append(key, data[key]);
    }
  });
  return api.put(`/guests/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const deleteGuest = (id) => api.delete(`/guests/${id}`);
