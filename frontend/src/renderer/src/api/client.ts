import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? "https://smart-quoter-production-d52e.up.railway.app"
    : "http://localhost:8000");

const client = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

export default client;
