import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_URL, API_TIMEOUT, TOKEN_STORAGE_KEY } from '../config/env';

function resolveEndpointUrl(endpoint: string): string {
  if (endpoint.startsWith('http')) return endpoint;
  const base = API_URL.replace(/\/+$/, '');
  const p = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (!p.startsWith('/api/')) {
    return `${base}/api${p}`;
  }
  return `${base}${p}`;
}

const apiClient: AxiosInstance = axios.create({
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor - Add auth token to headers & resolve API URL
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.url) {
      config.url = resolveEndpointUrl(config.url);
    }
    return config;
  },
  (error) => {
    console.warn('Request Error:', error);
    return Promise.reject(error);
  }
);

// Response Interceptor - Handle errors gracefully
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;

    if (status === 401) {
      console.warn('Unauthorized (401): Phiên đăng nhập đã hết hạn hoặc không hợp lệ.');
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem('authToken');
      localStorage.removeItem('auth_token');
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    } else if (status === 403) {
      console.warn('Forbidden (403): Bạn không có quyền thực hiện thao tác này.');
    } else if (status === 409) {
      console.warn('Conflict (409): Dữ liệu xung đột hoặc đã tồn tại.', error.response?.data);
    } else if (status === 422) {
      console.warn('Unprocessable Entity (422): Dữ liệu gửi lên không hợp lệ.', error.response?.data);
    } else if (status && status >= 500) {
      console.warn(`Server Error (${status}): Hệ thống máy chủ gặp sự cố.`, error.response?.data);
    } else if (!error.response) {
      console.warn('Network Error: Không thể kết nối tới máy chủ backend.', error.message);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
