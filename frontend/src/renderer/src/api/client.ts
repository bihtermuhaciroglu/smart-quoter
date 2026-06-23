import axios from "axios";

const isLocalhost =
  typeof window === "undefined" ||
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const API_URL =
  import.meta.env.VITE_API_URL ||
  (isLocalhost
    ? "http://localhost:8000"
    : "https://smart-quoter-production-d52e.up.railway.app");

const client = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

export default client;
