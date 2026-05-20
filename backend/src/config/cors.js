export function createAllowedOrigins() {
  const defaultOrigins = 'http://localhost:5173,http://localhost:5174';
  const origins = (process.env.FRONTEND_ORIGIN || defaultOrigins)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  
  console.log('CORS Allowed Origins:', origins);
  return origins;
}
