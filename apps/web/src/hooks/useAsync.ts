import { useEffect, useState } from 'react';

interface UseAsyncState<T> {
  status: 'idle' | 'pending' | 'success' | 'error';
  data: T | null;
  error: Error | null;
}

export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  immediate: boolean = true,
) {
  const [state, setState] = useState<UseAsyncState<T>>({
    status: 'idle',
    data: null,
    error: null,
  });

  useEffect(() => {
    if (!immediate) return;

    let isMounted = true;

    const execute = async () => {
      setState((s) => ({ ...s, status: 'pending' }));

      try {
        const result = await asyncFunction();
        if (isMounted) {
          setState({ status: 'success', data: result, error: null });
        }
      } catch (err) {
        if (isMounted) {
          setState({
            status: 'error',
            data: null,
            error: err instanceof Error ? err : new Error(String(err)),
          });
        }
      }
    };

    execute();

    return () => {
      isMounted = false;
    };
  }, [asyncFunction, immediate]);

  return state;
}
