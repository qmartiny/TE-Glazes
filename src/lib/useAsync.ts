import { useCallback, useEffect, useState } from 'react';

export interface AsyncState<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Run an async loader whenever `deps` change, ignoring stale results. */
export function useAsync<T>(load: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    load().then(
      (value) => {
        if (!active) return;
        setData(value);
        setLoading(false);
      },
      (err: unknown) => {
        if (!active) return;
        setError(errorMessage(err));
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, error, loading, reload };
}
