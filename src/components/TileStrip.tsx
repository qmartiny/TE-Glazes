import { Link } from 'react-router';
import { backend } from '../lib/api';
import { clayLabel } from '../lib/clays';
import { firingLabel } from '../lib/filters';
import type { ResultSummary } from '../types';

/**
 * Studio tiles as small thumbnails, labelled with clay and kiln. On a tile's own
 * page, `replace` swaps tiles in place, so Back still goes to where you came from.
 */
export function TileStrip({ tiles, replace = false }: { tiles: ResultSummary[]; replace?: boolean }) {
  return (
    <div className="tile-strip" role="list">
      {tiles.map((t) => (
        <Link key={t.id} to={`/c/${t.id}`} replace={replace} role="listitem" className="tile-mini">
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
