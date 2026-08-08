import axios, { AxiosError } from 'axios';

const API_BASE_URL = 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to handle unauthorized access and refresh tokens
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    const url = originalRequest?.url || '';
    
    const isAuthEndpoint = 
      url.includes('/auth/login') || 
      url.includes('/auth/register') || 
      url.includes('/auth/refresh') || 
      url.includes('/auth/logout');
      
    const hasSession = !!localStorage.getItem('pathfinder_user');
    
    // Check if error is 401 and we haven't retried yet, and it's not an auth endpoint, and the user has an active session
    if (
      error.response?.status === 401 && 
      originalRequest && 
      !originalRequest._retry && 
      !isAuthEndpoint && 
      hasSession
    ) {
      originalRequest._retry = true;
      try {
        // Attempt to refresh token
        await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        
        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh token failed or expired -> redirect to login (or clear auth status on frontend)
        // We will dispatch a custom event or let useAuth hook handle it
        window.dispatchEvent(new Event('auth-expired'));
        return Promise.reject(refreshError);
      }
    }
    
    // Extract server error message if available
    const responseData = error.response?.data as any;
    const serverMessage = responseData?.message || responseData?.error;
    if (serverMessage) {
      error.message = serverMessage;
    }
    
    return Promise.reject(error);
  }
);

export default api;
