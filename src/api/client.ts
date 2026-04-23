import axios from 'axios';
import { API_BASE_URL as ENV_API_BASE_URL, REACT_APP_API_BASE_URL } from '@env';
import { storage } from '../utils/storage';

// Same backend as the web app
export const API_BASE_URL =
  ENV_API_BASE_URL?.trim() ||
  (REACT_APP_API_BASE_URL?.trim() ? `${REACT_APP_API_BASE_URL.trim()}/api` : 'https://server.matrixtwin.com/api');

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach stored JWT on every request
client.interceptors.request.use(config => {
  const token = storage.getString('auth_token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// 401 → clear token (navigation handled in the store)
client.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      storage.delete('auth_token');
      storage.delete('auth_user');
    }
    return Promise.reject(error);
  },
);

export default client;
