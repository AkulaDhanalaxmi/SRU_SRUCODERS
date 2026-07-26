import axios from "axios";

const backendBase = process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:8000";
const api = axios.create({ baseURL: `${backendBase}/api`, timeout: 30000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("br_token") || sessionStorage.getItem("br_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function apiError(e) {
  if (!e?.response) {
    return `Backend connection failed. Please ensure:\n1. MongoDB is running (mongod)\n2. Backend server is running (python server.py)\n3. Backend is accessible at ${backendBase}`;
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
