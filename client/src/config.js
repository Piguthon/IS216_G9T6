// Base URL for our Express API: the full address in development, a relative path in production.
export const BASE_URL = import.meta.env.DEV ? 'http://localhost:8000/api' : '/api'
