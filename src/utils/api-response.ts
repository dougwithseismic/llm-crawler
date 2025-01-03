/**
 * Represents a standardized API response structure
 * @template T The type of data contained in the response
 */
type ApiResponse<T> = {
  /** Indicates if the API call was successful */
  success: boolean;
  /** Optional data payload returned on successful requests */
  data?: T;
  /** Error information returned on failed requests */
  error?: {
    /** Human readable error message */
    message: string;
    /** Error code for identifying error type */
    code?: string;
    /** Optional additional error details */
    details?: unknown;
  };
  /** Metadata about the API response */
  meta?: {
    /** ISO timestamp of when the response was generated */
    timestamp: string;
    /** Optional request ID for tracing/debugging */
    requestId?: string;
  };
};

/**
 * Creates a standardized API response object
 * @template T The type of data contained in the response
 * @param {Object} params - The parameters to create the response
 * @param {boolean} params.success - Whether the API call was successful
 * @param {T} [params.data] - Optional data payload for successful responses
 * @param {Object} [params.error] - Optional error information for failed responses
 * @param {string} [params.requestId] - Optional request ID for tracing
 * @returns {ApiResponse<T>} A formatted API response object
 */
const createApiResponse = <T>({
  success,
  data,
  error,
  requestId,
}: {
  success: boolean;
  data?: T;
  error?: { message: string; code?: string; details?: unknown };
  requestId?: string;
}): ApiResponse<T> => ({
  success,
  ...(data && { data }),
  ...(error && { error }),
  meta: {
    timestamp: new Date().toISOString(),
    ...(requestId && { requestId }),
  },
});

export { createApiResponse };
