import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { AddComboButton } from '../components/AddComboButton';
import { CardMedia, comboLink, GridSkeleton, LoadError } from '../components/Cards';
import { Icon } from '../components/Icon';
import { FIRINGS, GLAZES } from '../config';
import { clayLabel } from '../lib/clays';
import { firingLabel } from '../lib/filters';
import { useResults } from '../lib/results';
import { tileEntries, type TileEntry } from '../lib/tiles';
import type { Firing } from '../types';

/** The studio's own test tile for each glaze, one kiln at a time. */
export function TilesPage() {
  const [params, setParams] = useSearchParams();
  const firing: Firing = FIRINGS.find((f) => f.value === params.get('firing'))?.value ?? FIRINGS[0].value;
  const { results, error, retry } = useResults();
  const entries = useMemo(() => (results ? tileEntries(results, firing, GLAZES) : null), [results, firing]);
  const withTile = entries?.filter((e) => e.tile).length ?? 0;

  let body;
  if (error && !entries) body = <LoadError error={error} retry={retry} />;
  else if (!entries) body = <GridSkeleton />;
  else
    body = (
      <div className="grid">
        {entries.map((entry) => (
          <TileCard key={entry.key} entry={entry} firing={firing} />
        ))}
      </div>
    );

  return (
    <>
      <section className="intro">
        <h1 className="page-title">Studio test tiles</h1>
        <p className="section-supporting">
          The studio’s own test tile for each glaze, on its own. Tap one to see it with members’ results too.
        </p>
      </section>

      <div className="segmented tiles-kiln" role="radiogroup" aria-label="Kiln">
        {FIRINGS.map((f) => (
          <label key={f.value} className={`segment${firing === f.value ? ' selected' : ''}`}>
            <input
              type="radio"
              name="tiles-firing"
              value={f.value}
              checked={firing === f.value}
              onChange={() =>
                setParams(f.value === FIRINGS[0].value ? {} : { firing: f.value }, { replace: true, flushSync: true })
              }
            />
            {firing === f.value && <Icon name="check" />}
            {f.label}
          </label>
        ))}
      </div>
      {entries && (
        <p className="result-count">
          {withTile} of {entries.length} glazes have a tile
        </p>
      )}
      {body}
    </>
  );
}

function TileCard({ entry, firing }: { entry: TileEntry; firing: Firing }) {
  const { isStudioAdmin } = useAuth();
  const { tile } = entry;
  if (tile) {
    return (
      <Link to={comboLink(entry.key)} className="card combo-card">
        <CardMedia photo={tile.photos[0]} badges={null} />
        <div className="card-content">
          <h2 className="card-title">{entry.glaze}</h2>
          <p className="card-text">{clayLabel(tile.clays)}</p>
        </div>
      </Link>
    );
  }
  const other = entry.kilns.find((k) => k !== firing);
  return (
    <div className="card combo-card tile-missing">
      <div className="card-media">
        <div className="card-noimg">No tile yet</div>
      </div>
      <div className="card-content">
        <h2 className="card-title">{entry.glaze}</h2>
        <p className="card-text">
          {other ? (
            <Link to={comboLink(entry.key)}>{firingLabel(other)} tile only</Link>
          ) : (
            `No ${firingLabel(firing).toLowerCase()} tile yet`
          )}
        </p>
        {isStudioAdmin && (
          <AddComboButton
            to={`/new?tile=${encodeURIComponent(entry.glaze)}&firing=${firing}`}
            className="btn btn-tonal tile-add"
          >
            <Icon name="add_a_photo" /> Add tile
          </AddComboButton>
        )}
      </div>
    </div>
  );
}
