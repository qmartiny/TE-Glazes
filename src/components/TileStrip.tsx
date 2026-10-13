import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { backend } from '../lib/api';
import { clayLabel } from '../lib/clays';
import { firingLabel } from '../lib/filters';
import type { ResultSummary } from '../types';

/**
 * Studio tiles as small thumbnails, labelled with clay and kiln. `openId` is
 * the tile being shown below the strip (if any); tapping another swaps it.
 */
export function TileStrip({ tiles, openId }: { tiles: ResultSummary[]; openId?: string }) {
  const open = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    open.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [openId]);
  return (
    <div className="tile-strip" role="list">
      {tiles.map((t) => (
        <Link
          key={t.id}
          ref={t.id === openId ? open : undefined}
          to={`/c/${t.id}`}
          replace={openId !== undefined}
          role="listitem"
          className={`tile-mini${t.id === openId ? ' selected' : ''}`}
          aria-current={t.id === openId ? 'true' : undefined}
        >
          {t.photos[0] ? (
            <img src={backend.photoUrl(t.photos[0].thumb)} alt="" loading="lazy" decoding="async" />
          ) : (
            <span className="tile-mini-noimg" />
          )}
          <span className="tile-mini-clay">{clayLabel(t.clays)}</span>
          <span className="tile-mini-kiln">{firingLabel(t.firing)}</span>
        </Link>
      ))}
    </div>
  );
}
