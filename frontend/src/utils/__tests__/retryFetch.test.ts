import { fetchWithRetry, RETRY_CONFIGS } from '../retryFetch';
import { ApiError } from '../apiClient';

// Mock the apiFetch function
jest.mock('../apiClient', () => ({
  apiFetch: jest.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    details: Record<string, unknown>;

    constructor(message: string, status: number, details: Record<string, unknown> = {}) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.details = details;
    }
  },
  isNetworkError: (error: unknown): boolean => error instanceof Error && (error as ApiError).status === 0,
}));

describe('fetchWithRetry', () => {
  let mockApiFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockApiFetch = require('../apiClient').apiFetch;
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('returns data on successful first attempt', async () => {
    const mockData = { data: [{ id: 1, name: 'Test' }] };
    mockApiFetch.mockResolvedValueOnce(mockData);

    const resultPromise = fetchWithRetry('/api/test');

    // Fast-forward timers
    jest.runAllTimers();

    const result = await resultPromise;
    expect(result).toEqual(mockData);
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
  });

  test('retries on network error (status 0)', async () => {
    const networkError = new ApiError('Network error', 0);
    const mockData = { data: [] };

    // Fail twice, succeed on third attempt
    mockApiFetch
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce(mockData);

    const resultPromise = fetchWithRetry('/api/test');

    // Fast-forward through all retry delays
    jest.runAllTimers();

    const result = await resultPromise;
    expect(result).toEqual(mockData);
    expect(mockApiFetch).toHaveBeenCalledTimes(3);
  });

  test('retries on 500 server error', async () => {
    const serverError = new ApiError('Server error', 500);
    const mockData = { data: [] };

    mockApiFetch
      .mockRejectedValueOnce(serverError)
      .mockResolvedValueOnce(mockData);

    const resultPromise = fetchWithRetry('/api/test');

    jest.runAllTimers();

    const result = await resultPromise;
    expect(result).toEqual(mockData);
    expect(mockApiFetch).toHaveBeenCalledTimes(2);
  });

  test('retries on 429 rate limit error', async () => {
    const rateLimitError = new ApiError('Rate limited', 429);
    const mockData = { data: [] };

    mockApiFetch
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce(mockData);

    const resultPromise = fetchWithRetry('/api/test');

    jest.runAllTimers();

    const result = await resultPromise;
    expect(result).toEqual(mockData);
    expect(mockApiFetch).toHaveBeenCalledTimes(2);
  });

  test('does not retry on 400 client error', async () => {
    const clientError = new ApiError('Bad request', 400);

    mockApiFetch.mockRejectedValueOnce(clientError);

    await expect(fetchWithRetry('/api/test')).rejects.toThrow('Bad request');
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
  });

  test('does not retry on 401 unauthorized error', async () => {
    const authError = new ApiError('Unauthorized', 401);

    mockApiFetch.mockRejectedValueOnce(authError);

    await expect(fetchWithRetry('/api/test')).rejects.toThrow('Unauthorized');
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
  });

  test('throws error after max retries exceeded', async () => {
    const networkError = new ApiError('Network error', 0);

    // Fail all attempts
    mockApiFetch.mockRejectedValue(networkError);

    const resultPromise = fetchWithRetry('/api/test', {}, RETRY_CONFIGS.standard);

    jest.runAllTimers();

    await expect(resultPromise).rejects.toThrow('Network error');

    // Should try initial + 3 retries = 4 attempts
    expect(mockApiFetch).toHaveBeenCalledTimes(4);
  });

  test('uses custom retry config', async () => {
    const networkError = new ApiError('Network error', 0);
    const customConfig = {
      maxRetries: 1,
      initialDelay: 100,
      maxDelay: 1000,
      backoffMultiplier: 2,
    };

    mockApiFetch.mockRejectedValue(networkError);

    const resultPromise = fetchWithRetry('/api/test', {}, customConfig);

    jest.runAllTimers();

    await expect(resultPromise).rejects.toThrow('Network error');

    // Should try initial + 1 retry = 2 attempts
    expect(mockApiFetch).toHaveBeenCalledTimes(2);
  }, 10000); // Increase timeout

  test('uses quick retry config', async () => {
    const networkError = new ApiError('Network error', 0);

    mockApiFetch.mockRejectedValue(networkError);

    const resultPromise = fetchWithRetry('/api/test', {}, RETRY_CONFIGS.quick);

    jest.runAllTimers();

    await expect(resultPromise).rejects.toThrow('Network error');

    // Quick config: initial + 2 retries = 3 attempts
    expect(mockApiFetch).toHaveBeenCalledTimes(3);
  }, 10000); // Increase timeout

  test('uses aggressive retry config', async () => {
    const networkError = new ApiError('Network error', 0);

    mockApiFetch.mockRejectedValue(networkError);

    const resultPromise = fetchWithRetry('/api/test', {}, RETRY_CONFIGS.aggressive);

    jest.runAllTimers();

    await expect(resultPromise).rejects.toThrow('Network error');

    // Aggressive config: initial + 5 retries = 6 attempts
    expect(mockApiFetch).toHaveBeenCalledTimes(6);
  }, 10000); // Increase timeout

  test('uses none retry config (no retries)', async () => {
    const networkError = new ApiError('Network error', 0);

    mockApiFetch.mockRejectedValue(networkError);

    const resultPromise = fetchWithRetry('/api/test', {}, RETRY_CONFIGS.none);

    jest.runAllTimers();

    await expect(resultPromise).rejects.toThrow('Network error');

    // None config: no retries, just 1 attempt
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
  });
});
