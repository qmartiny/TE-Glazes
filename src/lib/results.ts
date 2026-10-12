import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import type { ResultSummary } from '../types';
import { backend } from './api';
import { errorMessage } from './useAsync';

// Everyone's posts (summaries only), loaded once and shared by the browse,
// combo and profile pages. Going "back" then shows the list instantly, at the
// same scroll position.

interface Cache {
  userId: string | null;
  promise: Promise<ResultSummary[]>;
  value?: ResultSummary[];
}

let cache: Cache | null = null;

function load(userId: string | null): Cache {
  // Private posts depend on who's signed in.
  if (cache && cache.userId === userId) return cache;
  const entry: Cache = { userId, promise: backend.listResults() };
  entry.promise.then(
    (value) => {
      entry.value = value;
    },
    () => {
      if (cache === entry) cache = null; // try again next time
    },
  );
  cache = entry;
  return entry;
}

/** Call after adding, editing or deleting a post. */
export function invalidateResults() {
  cache = null;
}

export interface ResultsState {
  results: ResultSummary[] | undefined;
  error: string | null;
  retry: () => void;
}

export function useResults(): ResultsState {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [state, setState] = useState<{ value?: ResultSummary[]; error: string | null }>(() => ({
    value: cache?.userId === userId ? cache.value : undefined,
    error: null,
  }));
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    const entry = load(userId);
    if (entry.value) setState({ value: entry.value, error: null });
    else setState({ error: null });
    entry.promise.then(
      (value) => active && setState({ value, error: null }),
      (err: unknown) => active && setState({ error: errorMessage(err) }),
    );
    return () => {
      active = false;
    };
  }, [userId, nonce]);

  return { results: state.value, error: state.error, retry: () => setNonce((n) => n + 1) };
}
