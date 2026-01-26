/**
 * Retry wrapper for API calls
 * Implements exponential backoff for failed requests
 */

import { apiFetch, isNetworkError, ApiError } from './apiClient';
import logger from './logger';
import { RetryConfig } from '../types';

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
};

/**
 * Check if error is retryable
 */
const isRetryableError = (error: unknown): boolean => {
  // Retry network errors
  if (isNetworkError(error)) {
    return true;
  }

  // Retry 5xx server errors
  if (error instanceof ApiError && error.status >= 500) {
    return true;
  }

  // Retry 429 (rate limit) errors
  if (error instanceof ApiError && error.status === 429) {
    return true;
  }

  // Don't retry client errors (4xx except 429)
  return false;
};

/**
 * Calculate delay with exponential backoff
 */
const calculateDelay = (attempt: number, config: RetryConfig): number => {
  const delay = Math.min(
    config.initialDelay * Math.pow(config.backoffMultiplier, attempt),
    config.maxDelay
  );

  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.3 * delay;
  return delay + jitter;
};

/**
 * Sleep for specified milliseconds
 */
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

interface FetchOptions extends RequestInit {
  method?: string;
  headers?: Record<string, string>;
}

/**
 * Fetch with retry logic
 *
 * @param url - API endpoint URL
 * @param options - Fetch options
 * @param retryConfig - Retry configuration
 * @returns Resolved with data or rejected with error
 */
export const fetchWithRetry = async <T = unknown>(
  url: string,
  options: FetchOptions = {},
  retryConfig: Partial<RetryConfig> = {}
): Promise<T> => {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  let lastError: Error;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      // First attempt or retry
      if (attempt > 0) {
        const delay = calculateDelay(attempt - 1, config);
        logger.info(`Retrying request to ${url} (attempt ${attempt}/${config.maxRetries}) after ${Math.round(delay)}ms`);
        await sleep(delay);
      }

      const data = await apiFetch<T>(url, options);

      // Log successful retry
      if (attempt > 0) {
        logger.info(`Request succeeded after ${attempt} retries: ${url}`);
      }

      return data;
    } catch (error) {
      lastError = error as Error;

      // Don't retry if error is not retryable
      if (!isRetryableError(error)) {
        logger.error(`Non-retryable error for ${url}`, error);
        throw error;
      }

      // Don't retry if max retries exceeded
      if (attempt >= config.maxRetries) {
        logger.error(`Max retries (${config.maxRetries}) exceeded for ${url}`, error);
        throw error;
      }

      logger.warn(`Request failed (attempt ${attempt + 1}/${config.maxRetries + 1}): ${url}`, error);
    }
  }

  // This should never be reached, but just in case
  throw lastError!;
};

/**
 * Preset configurations for different scenarios
 */
export const RETRY_CONFIGS: Record<string, RetryConfig> = {
  // Quick retry for interactive operations
  quick: {
    maxRetries: 2,
    initialDelay: 500,
    maxDelay: 2000,
    backoffMultiplier: 2,
  },

  // Standard retry for background operations
  standard: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  },

  // Aggressive retry for critical operations
  aggressive: {
    maxRetries: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  },

  // No retry - fail fast
  none: {
    maxRetries: 0,
    initialDelay: 0,
    maxDelay: 0,
    backoffMultiplier: 1,
  },
};
