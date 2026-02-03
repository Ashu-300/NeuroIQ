import axios from 'axios';
import { STORAGE_KEYS, API_BASE_URLS } from '../utils/constants';

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
// Queue of failed requests to retry after token refresh
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Create axios instance with default config
 * @param {string} baseURL - The base URL for the API
 * @param {object} options - Optional config overrides (e.g., { timeout: 0 } for no timeout)
 */
const createAxiosInstance = (baseURL, options = {}) => {
  const instance = axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  // Request interceptor - attach JWT token
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor - handle errors and token refresh
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // Handle 401 Unauthorized - attempt token refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        // Skip refresh for login/signup/refresh endpoints
        if (
          originalRequest.url?.includes('/api/auth/login') ||
          originalRequest.url?.includes('/api/auth/signup') ||
          originalRequest.url?.includes('/api/auth/token/refresh')
        ) {
          return Promise.reject(error);
        }

        if (isRefreshing) {
          // If already refreshing, queue this request
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return instance(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const refreshTokenValue = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

        if (!refreshTokenValue) {
          // No refresh token, logout user
          isRefreshing = false;
          localStorage.removeItem(STORAGE_KEYS.TOKEN);
          localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.USER);
          window.location.href = '/login';
          return Promise.reject(error);
        }

        try {
          // Call refresh token endpoint
          const authAxios = axios.create({
            baseURL: API_BASE_URLS.AUTH,
            timeout: 30000,
          });

          const response = await authAxios.post('/api/auth/token/refresh', {
            refresh_token: refreshTokenValue,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data;

          // Store new tokens
          localStorage.setItem(STORAGE_KEYS.TOKEN, accessToken);
          if (newRefreshToken) {
            localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
          }

          // Update authorization header
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;

          // Process queued requests
          processQueue(null, accessToken);

          isRefreshing = false;

          // Retry original request with new token
          return instance(originalRequest);
        } catch (refreshError) {
          // Refresh failed, logout user
          processQueue(refreshError, null);
          isRefreshing = false;

          localStorage.removeItem(STORAGE_KEYS.TOKEN);
          localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.USER);
          window.location.href = '/login';

          return Promise.reject(refreshError);
        }
      }

      // Normalize error response
      const normalizedError = {
        message: error.response?.data?.message || error.message || 'An error occurred',
        status: error.response?.status,
        data: error.response?.data,
      };

      return Promise.reject(normalizedError);
    }
  );

  return instance;
};

export default createAxiosInstance;
