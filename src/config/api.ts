// API Configuration
const isDevelopment = import.meta.env.DEV;

export const API_CONFIG = {
  // Use localhost in development, deployed backend in production
  BASE_URL: isDevelopment 
    ? 'http://localhost:3001' 
    : 'https://your-backend-url.herokuapp.com', // You'll need to replace this with your actual backend URL
  
  ENDPOINTS: {
    PROCESS_CONTENT: '/api/process-content',
    SOCKET_IO: '/'
  }
};

export const getApiUrl = (endpoint: string = '') => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

export const getSocketUrl = () => {
  return API_CONFIG.BASE_URL;
};