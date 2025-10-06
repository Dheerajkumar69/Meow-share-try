// API Configuration
// When served from backend, use relative URL (no base URL needed)
// When developing separately, use localhost backend
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.MODE === 'production' ? '' : 'http://localhost:3000');

export default {
  API_BASE_URL,
};
