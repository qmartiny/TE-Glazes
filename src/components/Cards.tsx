import { Fragment, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { PAGE_SIZE } from '../config';
import { backend } from '../lib/api';
import { comboTitle, firingLabel, firingsLabel, groupTitle, summarize, type ComboGroup } from '../lib/filters';
import { layerLabel } from '../lib/layers';
import type { Photo, ResultSummary } from '../types';
import { Icon } from './Icon';

export const comboLink = (key: string) => `/combo/${encodeURIComponent(key)}`;

function CardMedia({ photo, badges }: { photo: Photo | undefined; badges: ReactNode }) {
  return (
    <div className="card-media">
      {photo ? (
        <img src={backend.photoUrl(photo.thumb)} alt="" loading="lazy" decoding="async" />
      ) : (
        <div className="card-noimg">No photo</div>
      )}
      {badges}
    </div>
  );
}

const PrivateBadge = () => (
  <span className="media-badge media-badge-start">
    <Icon name="lock" /> Private
  </span>
);

/** One combo on the browse page: everyone's results for the same layers. */
export function GroupCard({
  group,
  results,
  names,
}: {
  group: ComboGroup;
  /** The results that match the current filters, newest first. */
  results: ResultSummary[];
  names: Map<string, string>;
}) {
  const cover = results.find((r) => r.photos.length) ?? group.results.find((r) => r.photos.length);
  const people = [...new Set(results.map((r) => r.userId))].map((id) => names.get(id) ?? 'A member');
  const count = group.results.length;
  return (
    <Link to={comboLink(group.key)} className="card combo-card">
      <CardMedia
        photo={cover?.photos[0]}
        badges={
          <>
            {group.results.every((r) => r.isPrivate) && <PrivateBadge />}
            {count > 1 && <span className="media-badge media-badge-end">{count} results</span>}
          </>
        }
      />
      <div className="card-content">
        <h3 className="card-title">{groupTitle(group)}</h3>
        <p className="card-text">
          {summarize(results.map((r) => r.clay))} · {firingsLabel(results.map((r) => r.firing))}
        </p>
        <p className="card-author">{summarize(people)}</p>
      </div>
    </Link>
  );
}

/** One member's own post (used on profiles). */
export function ResultCard({ result }: { result: ResultSummary }) {
  return (
    <Link to={`/c/${result.id}`} className="card combo-card">
      <CardMedia photo={result.photos[0]} badges={result.isPrivate && <PrivateBadge />} />
      <div className="card-content">
        <h3 className="card-title">{comboTitle(result)}</h3>
        {result.title && <p className="card-text">{result.layers.map(layerLabel).join(' + ')}</p>}
        <p className="card-text">
          {result.clay} · {firingLabel(result.firing)}
        </p>
      </div>
    </Link>
  );
}

// How many cards each list had shown, so "back" returns to the same place.
const shownCounts = new Map<string, number>();

interface GridProps<T> {
  items: T[];
  /** Identifies this list (e.g. the filters) for remembering how far you scrolled. */
  listKey: string;
  itemKey: (item: T) => string;
  render: (item: T) => ReactNode;
}

export function CardGrid<T>({ items, listKey, itemKey, render }: GridProps<T>) {
  const [shown, setShown] = useState(() => shownCounts.get(listKey) ?? PAGE_SIZE);
  const showMore = () => {
    const next = shown + PAGE_SIZE;
    shownCounts.set(listKey, next);
    setShown(next);
  };
  return (
    <>
      <div className="grid">
        {items.slice(0, shown).map((item) => (
          <Fragment key={itemKey(item)}>{render(item)}</Fragment>
        ))}
      </div>
      {items.length > shown && (
        <div className="load-more">
          <button className="btn btn-outlined" onClick={showMore}>
            Show more
          </button>
        </div>
      )}
    </>
  );
}

export function GridSkeleton() {
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

export function LoadError({ error, retry }: { error: string; retry: () => void }) {
  return (
    <div className="empty">
      <Icon name="error" className="empty-icon" />
      <p>Couldn't load combos: {error}</p>
      <button className="btn btn-tonal" onClick={retry}>
        Try again
      </button>
    </div>
  );
}
