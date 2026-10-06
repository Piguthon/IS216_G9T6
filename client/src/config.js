// src/config.js
// Base URL for calls to our own Express API (decision D4).
// Development: Vue runs on Vite (:5173) and Express on :8000, so the full address is needed.
// Production: Express serves this app and the API from the same site, so a relative path works.
// import.meta.env.DEV is a built-in Vite flag (true when running `pnpm dev`).
export const BASE_URL = import.meta.env.DEV ? 'http://localhost:8000/api' : '/api'
