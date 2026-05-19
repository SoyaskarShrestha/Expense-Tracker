export function createAllowedOrigins() {
  return (process.env.FRONTEND_ORIGIN || 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
