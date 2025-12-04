// Error handling utilities for API responses

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Handles API errors and returns user-friendly messages
 */
export function handleApiError(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        if (error.details && typeof error.details === 'object' && 'message' in error.details) {
          return (error.details as { message: string }).message;
        }
        return 'Invalid request data. Please check your input.';
      case 401:
        return 'Session expired. Please login again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'This action conflicts with existing data.';
      case 422:
        // Validation errors
        if (error.details && typeof error.details === 'object' && 'details' in error.details) {
          const validationErrors = (error.details as { details: Array<{ message: string }> }).details;
          if (Array.isArray(validationErrors)) {
            return validationErrors.map(d => d.message).join(', ');
          }
        }
        return 'Validation failed. Please check your input.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Server error. Please try again later.';
      case 503:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  }

  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }
    
    // CORS errors
    if (error.message.includes('CORS')) {
      return 'Connection blocked. Please contact support.';
    }

    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Formats error for logging
 */
export function formatErrorForLogging(error: unknown): string {
  if (error instanceof ApiError) {
    return `ApiError [${error.status}]: ${error.message}${error.details ? ` - ${JSON.stringify(error.details)}` : ''}`;
  }
  
  if (error instanceof Error) {
    return `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ''}`;
  }
  
  return String(error);
}

/**
 * Type guard for checking if error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Creates a standardized error from fetch response
 */
export async function createApiErrorFromResponse(response: Response): Promise<ApiError> {
  let details: unknown;
  
  try {
    details = await response.json();
  } catch {
    details = { message: response.statusText };
  }
  
  const message = 
    (details && typeof details === 'object' && 'message' in details)
      ? (details as { message: string }).message
      : `Request failed with status ${response.status}`;
  
  return new ApiError(message, response.status, details);
}

