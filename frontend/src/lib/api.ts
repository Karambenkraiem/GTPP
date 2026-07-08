import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gtpp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('gtpp_token');
      localStorage.removeItem('gtpp_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const authApi = {
  login: (matricule: string, password: string) =>
    api.post('/auth/login', { matricule, password }).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
  updateMe: (data: { nom: string; prenom: string }) =>
    api.put('/auth/me', data).then((r) => r.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/change-password', { currentPassword, newPassword }).then((r) => r.data),
  demoUsers: () => api.get('/auth/demo-users').then((r) => r.data),
};

// Users
export const usersApi = {
  list: () => api.get('/users').then((r) => r.data),
  create: (data: any) => api.post('/users', data).then((r) => r.data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/users/${id}`).then((r) => r.data),
};

// Journées
export const journeesApi = {
  list: (params?: { from?: string; to?: string }) =>
    api.get('/journees', { params }).then((r) => r.data),
  today: () => api.get('/journees/today').then((r) => r.data),
  get: (id: string) => api.get(`/journees/${id}`).then((r) => r.data),
  create: (data: any) => api.post('/journees', data).then((r) => r.data),
  update: (id: string, data: any) => api.put(`/journees/${id}`, data).then((r) => r.data),
  validerBloc: (id: string) => api.post(`/journees/${id}/valider-bloc`).then((r) => r.data),
  validerQuart: (id: string) => api.post(`/journees/${id}/valider-quart`).then((r) => r.data),
  transmettre: (id: string) => api.post(`/journees/${id}/transmettre`).then((r) => r.data),
};

// Postes
export const postesApi = {
  listByJournee: (journeeId: string) =>
    api.get(`/postes/journee/${journeeId}`).then((r) => r.data),
  create: (data: any) => api.post('/postes', data).then((r) => r.data),
  update: (id: string, data: any) => api.put(`/postes/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/postes/${id}`).then((r) => r.data),
};

// Relevés
export const relevesApi = {
  listBloc: (journeeId: string) =>
    api.get(`/releves/bloc/journee/${journeeId}`).then((r) => r.data),
  getBloc: (id: string) => api.get(`/releves/bloc/${id}`).then((r) => r.data),
  createBloc: (data: any) => api.post('/releves/bloc', data).then((r) => r.data),
  updateBloc: (id: string, data: any) => api.put(`/releves/bloc/${id}`, data).then((r) => r.data),
  deleteBloc: (id: string) => api.delete(`/releves/bloc/${id}`).then((r) => r.data),

  listOp: (journeeId: string) =>
    api.get(`/releves/operateur/journee/${journeeId}`).then((r) => r.data),
  getOp: (id: string) => api.get(`/releves/operateur/${id}`).then((r) => r.data),
  createOp: (data: any) => api.post('/releves/operateur', data).then((r) => r.data),
  updateOp: (id: string, data: any) => api.put(`/releves/operateur/${id}`, data).then((r) => r.data),
  deleteOp: (id: string) => api.delete(`/releves/operateur/${id}`).then((r) => r.data),
  listJour: (date: string) => api.get(`/releves/jour/${date}`).then((r) => r.data),

  getCompteurs: (journeeId: string) =>
    api.get(`/releves/compteurs/${journeeId}`).then((r) => r.data),
  saveCompteurs: (data: any) => api.post('/releves/compteurs', data).then((r) => r.data),
};

// Manœuvres
export const manouvresApi = {
  list: (journeeId: string) =>
    api.get(`/manouvres/journee/${journeeId}`).then((r) => r.data),
  create: (data: any) => api.post('/manouvres', data).then((r) => r.data),
  update: (id: string, data: any) => api.put(`/manouvres/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/manouvres/${id}`).then((r) => r.data),
};

// Alarmes
export const alarmesApi = {
  list: (journeeId: string) =>
    api.get(`/alarmes/journee/${journeeId}`).then((r) => r.data),
  create: (data: any) => api.post('/alarmes', data).then((r) => r.data),
  update: (id: string, data: any) => api.put(`/alarmes/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/alarmes/${id}`).then((r) => r.data),
};

// OT
export const otApi = {
  list: (journeeId: string) =>
    api.get(`/ot/journee/${journeeId}`).then((r) => r.data),
  listAll: () => api.get('/ot').then((r) => r.data),
  create: (data: any) => api.post('/ot', data).then((r) => r.data),
  update: (id: string, data: any) => api.put(`/ot/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/ot/${id}`).then((r) => r.data),
  listDs: (journeeId: string) =>
    api.get(`/ot/ds/journee/${journeeId}`).then((r) => r.data),
  createDs: (data: any) => api.post('/ot/ds', data).then((r) => r.data),
  removeDs: (id: string) => api.delete(`/ot/ds/${id}`).then((r) => r.data),
};

// Défauts
export const defautsApi = {
  list: (params?: { actif?: string; zone?: string }) =>
    api.get('/defauts', { params }).then((r) => r.data),
  create: (data: any) => api.post('/defauts', data).then((r) => r.data),
  update: (id: string, data: any) => api.put(`/defauts/${id}`, data).then((r) => r.data),
  cloturer: (id: string) => api.post(`/defauts/${id}/cloturer`).then((r) => r.data),
  listSeuils: () => api.get('/defauts/seuils').then((r) => r.data),
  updateSeuil: (id: string, data: any) => api.put(`/defauts/seuils/${id}`, data).then((r) => r.data),
};

// Dashboard
export const dashboardApi = {
  get: () => api.get('/dashboard').then((r) => r.data),
};

// Rapport
export const rapportApi = {
  get: (date: string) => api.get('/rapport', { params: { date } }).then((r) => r.data),
};
