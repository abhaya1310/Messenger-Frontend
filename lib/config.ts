// Frontend configuration
// All API calls use NEXT_PUBLIC_BACKEND_URL to connect directly to backend
// This allows frontend and backend to be deployed separately

/**
 * Normalizes and validates a URL string
 * - Removes trailing slashes
 * - Ensures protocol is present (defaults to https for production)
 * - Validates URL format
 */
function normalizeUrl(url: string | undefined, defaultUrl: string): string {
  if (!url || url.trim() === '') {
    return defaultUrl;
  }

  let normalized = url.trim();

  // Remove trailing slashes
  normalized = normalized.replace(/\/+$/, '');

  // If no protocol, default to https for production, http for localhost
  if (!normalized.match(/^https?:\/\//)) {
    if (normalized.includes('localhost') || normalized.includes('127.0.0.1')) {
      normalized = `http://${normalized}`;
    } else {
      normalized = `https://${normalized}`;
    }
  }

  // Validate URL format
  try {
    new URL(normalized);
  } catch (error) {
    console.error(`Invalid API URL format: ${url}. Using default: ${defaultUrl}`);
    return defaultUrl;
  }

  return normalized;
}

/**
 * Gets the API base URL with validation and normalization
 */
function getApiUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const defaultUrl = 'http://localhost:3000';
  
  const apiUrl = normalizeUrl(envUrl, defaultUrl);

  // Warn if using default in production
  if (typeof window !== 'undefined' && apiUrl === defaultUrl && !window.location.hostname.includes('localhost')) {
    console.warn(
      'NEXT_PUBLIC_BACKEND_URL is not set. Using default localhost URL. ' +
      'This may cause connection errors in production. ' +
      'Please set NEXT_PUBLIC_BACKEND_URL in your environment variables.'
    );
  }

  return apiUrl;
}

export const config = {
  apiUrl: getApiUrl(),
  adminToken: process.env.NEXT_PUBLIC_ADMIN_TOKEN || '',
} as const;
