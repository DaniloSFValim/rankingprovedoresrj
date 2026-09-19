import { useState, useCallback } from 'react';

interface UseRetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
}

interface UseRetryState {
  isLoading: boolean;
  error: Error | null;
  isRetrying: boolean;
  attempts: number;
}

export function useRetry<T>(
  fetchFn: () => Promise<T>,
  options: UseRetryOptions = {},
) {
  const { maxAttempts = 3, initialDelay = 1000, maxDelay = 10000 } = options;
  const [state, setState] = useState<UseRetryState>({
    isLoading: false,
    error: null,
    isRetrying: false,
    attempts: 0,
  });
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(
    async (forceRetry = false) => {
      if (forceRetry) {
        setState((prev) => ({ ...prev, isRetrying: true, error: null, attempts: 0 }));
      } else {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));
      }

      let lastError: Error | null = null;
      let attempts = 0;

      while (attempts < maxAttempts) {
        try {
          const result = await fetchFn();
          setData(result);
          setState((prev) => ({ ...prev, isLoading: false, isRetrying: false, error: null, attempts: 0 }));
          return result;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          attempts++;

          if (attempts < maxAttempts) {
            const delay = Math.min(initialDelay * Math.pow(2, attempts - 1), maxDelay);
            await new Promise((resolve) => setTimeout(resolve, delay));
            setState((prev) => ({ ...prev, attempts }));
          }
        }
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        isRetrying: false,
        error: lastError,
        attempts: maxAttempts,
      }));
      throw lastError;
    },
    [fetchFn, maxAttempts, initialDelay, maxDelay],
  );

  const retry = useCallback(() => execute(true), [execute]);

  return {
    data,
    ...state,
    execute,
    retry,
  };
}
