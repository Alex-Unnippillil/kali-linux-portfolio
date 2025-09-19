export interface FetchRetryInfo {
  /**
   * 1-based retry attempt. 1 indicates the first retry after the initial request.
   */
  attempt: number;
  /**
   * Delay in milliseconds that will be waited before the retry.
   */
  delay: number;
  /**
   * The error or response that triggered the retry.
   */
  error: unknown;
}

export interface FetchCancelToken {
  controller: AbortController;
  signal: AbortSignal;
  cancel: () => void;
}

export interface FetchWithRetryOptions extends RequestInit {
  /**
   * Number of retry attempts after the initial request. Defaults to 2.
   */
  retries?: number;
  /**
   * Base delay in milliseconds for the exponential backoff. Defaults to 250ms.
   */
  baseDelay?: number;
  /**
   * Maximum delay in milliseconds between retries. Defaults to 4000ms.
   */
  maxDelay?: number;
  /**
   * Multiplier used for the exponential backoff. Defaults to 2.
   */
  backoffFactor?: number;
  /**
   * Whether to apply jitter to each delay. Defaults to true.
   */
  jitter?: boolean | ((delay: number, attempt: number) => number);
  /**
   * Optional cancel token shared across multiple requests.
   */
  cancelToken?: FetchCancelToken;
  /**
   * Optional AbortSignal to link with the retry controller.
   */
  signal?: AbortSignal;
  /**
   * Custom fetch implementation. Defaults to the global fetch.
   */
  fetcher?: typeof fetch;
  /**
   * Called before each retry with the retry meta data.
   */
  onRetry?: (info: FetchRetryInfo) => void;
  /**
   * Callback invoked before each attempt (including the initial one).
   */
  onAttempt?: (attempt: number) => void;
  /**
   * Custom random function used when jitter is enabled. Defaults to Math.random.
   */
  random?: () => number;
  /**
   * Determines whether a response should trigger a retry. By default, only 5xx responses retry.
   */
  retryOnResponse?: (response: Response) => boolean;
  /**
   * Determines whether a thrown error should trigger a retry. By default, retries everything except AbortError.
   */
  retryOnError?: (error: unknown) => boolean;
}

export interface FetchWithRetryResult {
  promise: Promise<Response>;
  cancel: () => void;
  /**
   * Returns the number of retries that have been attempted so far.
   */
  getRetryCount: () => number;
  signal: AbortSignal;
}

const defaultRetryOnResponse = (response: Response) => response.status >= 500;

const defaultRetryOnError = (error: unknown) => {
  if (!error) return true;
  if (typeof error === 'object' && 'name' in error) {
    return (error as { name?: string }).name !== 'AbortError';
  }
  return true;
};

const createAbortError = () => new DOMException('Aborted', 'AbortError');

const waitWithAbort = (delay: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (delay <= 0) {
      resolve();
      return;
    }
    if (signal.aborted) {
      reject(createAbortError());
      return;
    }
    const timeout = setTimeout(() => {
      signal.removeEventListener('abort', abortHandler);
      resolve();
    }, delay);

    const abortHandler = () => {
      clearTimeout(timeout);
      signal.removeEventListener('abort', abortHandler);
      reject(createAbortError());
    };

    signal.addEventListener('abort', abortHandler);
  });

const computeDelay = (
  baseDelay: number,
  factor: number,
  maxDelay: number,
  attempt: number,
  jitter: boolean | ((delay: number, attempt: number) => number),
  random: () => number
) => {
  const exponential = Math.min(maxDelay, baseDelay * Math.pow(factor, Math.max(0, attempt - 1)));
  if (jitter === false) {
    return exponential;
  }
  if (typeof jitter === 'function') {
    return Math.max(0, Math.min(maxDelay, jitter(exponential, attempt)));
  }
  return Math.max(0, Math.min(maxDelay, exponential * random()));
};

export const createFetchCancelToken = (): FetchCancelToken => {
  const controller = new AbortController();
  return {
    controller,
    signal: controller.signal,
    cancel: () => controller.abort(),
  };
};

export const fetchWithRetry = (
  input: RequestInfo | URL,
  options: FetchWithRetryOptions = {}
): FetchWithRetryResult => {
  const {
    retries = 2,
    baseDelay = 250,
    maxDelay = 4000,
    backoffFactor = 2,
    jitter = true,
    cancelToken,
    fetcher,
    onRetry,
    onAttempt,
    random = Math.random,
    retryOnResponse = defaultRetryOnResponse,
    retryOnError = defaultRetryOnError,
    signal: externalSignal,
    ...fetchOptions
  } = options;

  const controller = cancelToken?.controller ?? new AbortController();

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      const abortHandler = () => controller.abort();
      externalSignal.addEventListener('abort', abortHandler);
      controller.signal.addEventListener('abort', () =>
        externalSignal.removeEventListener('abort', abortHandler)
      );
    }
  }

  const execFetch = fetcher ?? fetch;
  let retryCount = 0;
  let lastError: unknown;

  const attemptRequest = async (): Promise<Response> => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (controller.signal.aborted) {
        throw createAbortError();
      }

      onAttempt?.(attempt + 1);
      try {
        const response = await execFetch(input, {
          ...fetchOptions,
          signal: controller.signal,
        });
        if (!retryOnResponse(response)) {
          return response;
        }
        lastError = response;
      } catch (error) {
        if (controller.signal.aborted) {
          throw createAbortError();
        }
        lastError = error;
        if (!retryOnError(error)) {
          throw error;
        }
      }

      if (attempt >= retries) {
        break;
      }

      retryCount += 1;
      const delay = computeDelay(
        baseDelay,
        backoffFactor,
        maxDelay,
        retryCount,
        jitter,
        random
      );
      onRetry?.({ attempt: retryCount, delay, error: lastError });
      await waitWithAbort(delay, controller.signal);
    }

    if (lastError instanceof Response) {
      return lastError;
    }
    if (lastError) {
      throw lastError;
    }
    throw new Error('fetchWithRetry failed without an error');
  };

  const promise = attemptRequest();

  const cancel = () => {
    if (!controller.signal.aborted) {
      controller.abort();
    }
    cancelToken?.cancel();
  };

  return {
    promise,
    cancel,
    getRetryCount: () => retryCount,
    signal: controller.signal,
  };
};

export default fetchWithRetry;
