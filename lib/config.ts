// Frontend configuration
// All API calls use NEXT_PUBLIC_BACKEND_URL to connect directly to backend
// This allows frontend and backend to be deployed separately
export const config = {
  apiUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000',
  adminToken: process.env.NEXT_PUBLIC_ADMIN_TOKEN || '',
} as const;
