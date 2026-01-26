/**
 * API Client with centralized error handling and CSRF protection
 */

// Store CSRF token globally
let csrfToken: string | null = null;

/**
 * Get current CSRF token
 */
export const getCsrfToken = (): string | null => csrfToken;

/**
 * Set CSRF token
 */
export const setCsrfToken = (token: string | null): void => {
  csrfToken = token;
};

export class ApiError extends Error {
  status: number;
  details: Record<string, unknown>;

  constructor(message: string, status: number, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Parse error response from API
 */
export const parseErrorResponse = async (response: Response): Promise<string> => {
  try {
    const data = await response.json();
    return data.error || `HTTP ${response.status}: ${response.statusText}`;
  } catch {
    return `HTTP ${response.status}: ${response.statusText}`;
  }
};

interface FetchOptions extends RequestInit {
  method?: string;
  headers?: Record<string, string>;
}

/**
 * Fetch wrapper with error handling and CSRF protection
 */
export const apiFetch = async <T = unknown>(url: string, options: FetchOptions = {}): Promise<T> => {
  try {
    // Prepare headers
    const headers: Record<string, string> = {
      ...options.headers,
    };

    // Add CSRF token for state-changing requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method?.toUpperCase() || '')) {
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }
    }

    const response = await fetch(url, {
      credentials: 'include',
      ...options,
      headers,
    });

    // Extract and store CSRF token from response
    const token = response.headers.get('X-CSRF-Token');
    if (token) {
      setCsrfToken(token);
    }

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
      error instanceof Error ? error.message : 'An unexpected error occurred',
      0,
      { originalError: error }
    );
  }
};

/**
 * Get user-friendly error message
 */
export const getErrorMessage = (error: unknown, defaultMessage: string = 'An error occurred'): string => {
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
export const isAuthError = (error: unknown): boolean => {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
};

/**
 * Check if error is network error
 */
export const isNetworkError = (error: unknown): boolean => {
  return error instanceof ApiError && error.status === 0;
};
