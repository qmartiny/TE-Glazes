import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { PAGE_SIZE } from '../config';
import { backend, type Page } from '../lib/api';
import { paramsFromFilters } from '../lib/filters';
import { errorMessage } from '../lib/useAsync';
import type { Combo, ComboFilters } from '../types';
import { ComboCard } from './ComboCard';
import { Icon } from './Icon';

// Remember what was loaded per filter set, so going "back" from a combo
// shows the list instantly (and at the same scroll position).
const cache = new Map<string, Page<Combo>>();

export function invalidateComboCache() {
  cache.clear();
}

interface Props {
  filters: ComboFilters;
  empty: ReactNode;
  showAuthor?: boolean;
}

export function ComboList({ filters, empty, showAuthor = true }: Props) {
  const { user } = useAuth();
  // Private combos depend on who's signed in, so they're part of the key.
  const key = `${user?.id ?? ''}|${paramsFromFilters(filters)}`;
  const [page, setPage] = useState<Page<Combo> | null>(() => cache.get(key) ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    const cached = cache.get(key);
    setPage(cached ?? null);
    setError(null);
    const count = Math.max(PAGE_SIZE, cached?.items.length ?? 0);
    backend.listCombos(filters, 0, count).then(
      (result) => {
        if (!active) return;
        cache.set(key, result);
        setPage(result);
      },
      (err: unknown) => active && setError(errorMessage(err)),
    );
    return () => {
      active = false;
    };
    // `key` captures everything in `filters` plus the signed-in user.
  }, [key, nonce]);

  async function loadMore() {
    if (!page) return;
    setLoadingMore(true);
    try {
      const next = await backend.listCombos(filters, page.items.length, PAGE_SIZE);
      const seen = new Set(page.items.map((c) => c.id));
      const merged = { items: [...page.items, ...next.items.filter((c) => !seen.has(c.id))], hasMore: next.hasMore };
      cache.set(key, merged);
      setPage(merged);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  }

  if (error && !page) {
    return (
      <div className="empty">
        <Icon name="error" className="empty-icon" />
        <p>Couldn't load combos: {error}</p>
        <button className="btn btn-tonal" onClick={() => setNonce((n) => n + 1)}>
          Try again
        </button>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="grid" aria-busy="true" aria-label="Loading">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="card card-skeleton">
            <div className="card-media" />
            <div className="card-content">
              <div className="skeleton-line" />
              <div className="skeleton-line short" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!page.items.length) return <>{empty}</>;

  return (
    <>
      <div className="grid">
        {page.items.map((combo) => (
          <ComboCard key={combo.id} combo={combo} showAuthor={showAuthor} />
        ))}
      </div>
      {error && <p className="form-error">{error}</p>}
      {page.hasMore && (
        <div className="load-more">
          <button className="btn btn-outlined" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </>
  );
}
