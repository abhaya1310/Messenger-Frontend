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
    const isProduction = !window.location.hostname.includes('localhost') &&
      !window.location.hostname.includes('127.0.0.1');

    console.error(
      '⚠️ PRODUCTION CONFIGURATION ERROR:\n' +
      'NEXT_PUBLIC_BACKEND_URL is not set. Using default localhost URL.\n' +
      'This will cause connection errors in production.\n\n' +
      'Please set NEXT_PUBLIC_BACKEND_URL in your environment variables:\n' +
      `  - For AWS deployment: Set to your Vercel backend URL (e.g., https://csat-cloud.vercel.app)\n` +
      `  - Current hostname: ${window.location.hostname}\n` +
      `  - Current origin: ${window.location.origin}`
    );

    if (isProduction) {
      // In production, this is a critical error
      console.error(
        '\n🚨 CRITICAL: Frontend is deployed but backend URL is not configured.\n' +
        'All API calls will fail. Update NEXT_PUBLIC_BACKEND_URL immediately.'
      );
    }
  }

  return apiUrl;
}

const apiUrl = getApiUrl();

// Log configuration in browser console for debugging (only in browser)
if (typeof window !== 'undefined') {
  console.log('[Config] API Base URL:', apiUrl);
  console.log('[Config] NEXT_PUBLIC_BACKEND_URL:', process.env.NEXT_PUBLIC_BACKEND_URL || 'NOT SET');
  console.log('[Config] Using default (localhost:3000):', apiUrl === 'http://localhost:3000' && !window.location.hostname.includes('localhost'));
}

export const config = {
  apiUrl,
} as const;

// Re-export auth helpers for convenience
export { getCurrentOrgId, getAuthToken } from './auth';
