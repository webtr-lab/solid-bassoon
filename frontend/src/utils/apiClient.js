/**
 * API Client with centralized error handling
 */

export class ApiError extends Error {
  constructor(message, status, details = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Parse error response from API
 */
export const parseErrorResponse = async (response) => {
  try {
    const data = await response.json();
    return data.error || `HTTP ${response.status}: ${response.statusText}`;
  } catch {
    return `HTTP ${response.status}: ${response.statusText}`;
  }
};

/**
 * Fetch wrapper with error handling
 */
export const apiFetch = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      credentials: 'include',
      ...options,
    });

    if (!response.ok) {
      const error = await parseErrorResponse(response);
      throw new ApiError(error, response.status, { url, options });
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Network error or JSON parsing error
    if (error instanceof TypeError) {
      throw new ApiError(
        'Network error. Please check your connection and try again.',
        0,
        { originalError: error.message }
      );
    }

    throw new ApiError(
      error.message || 'An unexpected error occurred',
      0,
      { originalError: error }
    );
  }
};

/**
 * Get user-friendly error message
 */
export const getErrorMessage = (error, defaultMessage = 'An error occurred') => {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return defaultMessage;
};

/**
 * Check if error is authentication error
 */
export const isAuthError = (error) => {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
};

/**
 * Check if error is network error
 */
export const isNetworkError = (error) => {
  return error instanceof ApiError && error.status === 0;
};
