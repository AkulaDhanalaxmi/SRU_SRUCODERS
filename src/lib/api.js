import axios from "axios";

const defaultBackend = process.env.NODE_ENV === "production"
  ? "https://myntra-speedandtrustt.onrender.com"
  : "http://127.0.0.1:8000";
const backendBase = process.env.REACT_APP_BACKEND_URL || defaultBackend;
const api = axios.create({ baseURL: `${backendBase}/api`, timeout: 30000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("br_token") || sessionStorage.getItem("br_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      // Network error - backend is not responding
      error.isConnectionError = true;
      error.message = `Cannot connect to backend at ${backendBase}/api. Make sure the backend server is running and MongoDB is available.`;
    }
    return Promise.reject(error);
  }
);

export function apiError(e) {
  if (!e?.response) {
    // MongoDB or backend not available
    if (e?.code === 'ECONNREFUSED' || e?.isConnectionError) {
      return `Backend connection failed. Please ensure:\n1. MongoDB is running (mongod)\n2. Backend server is running (python server.py)\n3. Backend is accessible at ${backendBase}`;
    }
    return "Network connection failed. Please check your internet connection and try again.";
  }
  const d = e?.response?.data?.detail;
  if (typeof d === "string") return d;
  if (typeof d === "object" && d !== null) {
    if (typeof d.message === "string") return d.message;
    if (typeof d.error === "string") return d.error;
    return JSON.stringify(d);
  }
  if (Array.isArray(d)) return d.map((x) => x?.msg || "").join(" ");
  return e?.message || "Something went wrong";
}

export default api;
