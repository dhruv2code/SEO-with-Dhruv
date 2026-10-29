import axios from 'axios';
// Reserved for the FastAPI integration phase. Credentials and tokens belong only on the backend.
export const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000', timeout: 30000, withCredentials: true });
