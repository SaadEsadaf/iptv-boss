import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const websiteId = localStorage.getItem('admin_website_id');
  if (websiteId && config.url.startsWith('/admin')) {
    config.params = { ...config.params, website_id: websiteId };
  }

  return config;
});

api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    if (window.location.pathname.startsWith('/admin')) {
      window.location.hash = '#login';
    }
  }
  return Promise.reject(err);
});

export default api;
