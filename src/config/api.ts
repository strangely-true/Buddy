// API Configuration
const isDevelopment = import.meta.env.DEV;

export const API_CONFIG = {
  // Use localhost in development, deployed backend in production
  BASE_URL: isDevelopment 
    ? 'http://localhost:3001' 
    : 'https://your-backend-url.herokuapp.com', // Replace with your actual backend URL
  
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

// Check if backend is available
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/health`, {
      method: 'GET',
      timeout: 5000
    });
    return response.ok;
  } catch (error) {
    console.warn('Backend health check failed:', error);
    return false;
  }
};