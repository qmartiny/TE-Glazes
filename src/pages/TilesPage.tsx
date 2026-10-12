import { useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { AddComboButton } from '../components/AddComboButton';
import { CardMedia, GridSkeleton, LoadError, comboLink } from '../components/Cards';
import { SelectField } from '../components/Fields';
import { Icon } from '../components/Icon';
import { CLAYS, FIRINGS, GLAZES } from '../config';
import { normalizeClays } from '../lib/clays';
import { readPref, writePref } from '../lib/format';
import { useResults } from '../lib/results';
import { clayTileCounts, tileEntries, type TileEntry } from '../lib/tiles';
import type { ClayPart, Firing } from '../types';

interface Viewed {
  clay?: string;
  firing?: Firing;
}

/**
 * Which clay to show when the link doesn't say: the one you looked at last,
 * else the clay you post with, else the clay with the most tiles.
 */
function defaultClay(counts: { clay: string; count: number }[], viewed: string | undefined): string {
  const has = (clay: string | undefined) => counts.find((c) => c.clay === clay);
  if (has(viewed)) return viewed!;
  const last = readPref<{ clays?: ClayPart[]; clay?: string }>('last');
  const yours = normalizeClays(last?.clays, last?.clay)[0]?.name;
  if (has(yours)?.count) return yours!;
  const most = [...counts].sort((a, b) => b.count - a.count)[0];
  return most?.count ? most.clay : CLAYS[0];
}

/** The studio's test tiles: every glaze on one clay, in one kiln. */
export function TilesPage() {
  const [params, setParams] = useSearchParams();
  // A link says which clay and kiln; otherwise carry on where you left off.
  const viewed = params.has('clay') ? {} : (readPref<Viewed>('tiles') ?? {});
  const firing: Firing =
    FIRINGS.find((f) => f.value === (params.get('firing') ?? viewed.firing))?.value ?? FIRINGS[0].value;
  const { results, error, retry } = useResults();
  const counts = useMemo(() => (results ? clayTileCounts(results, firing, CLAYS) : null), [results, firing]);
  const clay = params.get('clay') ?? (counts ? defaultClay(counts, viewed.clay) : CLAYS[0]);
  const entries = useMemo(() => (results ? tileEntries(results, clay, firing, GLAZES) : null), [results, clay, firing]);
  const withTile = entries?.filter((e) => e.tile).length ?? 0;

  useEffect(() => {
    if (counts) writePref('tiles', { clay, firing } satisfies Viewed);
  }, [counts, clay, firing]);

  // flushSync: apply right away so the controls never show the old choice.
  const choose = (next: { clay?: string; firing?: Firing }) => {
    const f = next.firing ?? firing;
    setParams(
      { clay: next.clay ?? clay, ...(f === FIRINGS[0].value ? {} : { firing: f }) },
      { replace: true, flushSync: true },
    );
  };

  let body;
  if (error && !entries) body = <LoadError error={error} retry={retry} />;
  else if (!entries) body = <GridSkeleton />;
  else
    body = (
      <div className="grid">
        {entries.map((entry) => (
          <TileCard key={entry.key} entry={entry} clay={clay} firing={firing} />
        ))}
      </div>
    );

  return (
    <>
      <section className="intro">
        <h1 className="page-title">Studio test tiles</h1>
        <p className="section-supporting">
          The studio fires a tile of every glaze on every clay. Pick a clay and kiln to see them side by side.
        </p>
      </section>

      <div className="tiles-controls">
        <SelectField label="Clay" aria-label="Clay" value={clay} onChange={(e) => choose({ clay: e.target.value })}>
          {(counts ?? [{ clay, count: 0 }]).map((c) => (
            <option key={c.clay} value={c.clay}>
              {c.clay} ({c.count ? `${c.count} ${c.count === 1 ? 'tile' : 'tiles'}` : 'no tiles yet'})
            </option>
          ))}
        </SelectField>
        <div className="segmented" role="radiogroup" aria-label="Kiln">
          {FIRINGS.map((f) => (
            <label key={f.value} className={`segment${firing === f.value ? ' selected' : ''}`}>
              <input
                type="radio"
                name="tiles-firing"
                value={f.value}
                checked={firing === f.value}
                onChange={() => choose({ firing: f.value })}
              />
              {firing === f.value && <Icon name="check" />}
              {f.label}
            </label>
          ))}
        </div>
      </div>
      {entries && (
        <p className="result-count">
          {withTile} of {entries.length} glazes on {clay}
        </p>
      )}
      {body}
    </>
  );
}

function TileCard({ entry, clay, firing }: { entry: TileEntry; clay: string; firing: Firing }) {
  const { isStudioAdmin } = useAuth();
  const { tile } = entry;
  if (tile) {
    return (
      <Link to={`/c/${tile.id}`} className="card combo-card">
        <CardMedia photo={tile.photos[0]} badges={null} />
        <div className="card-content">
          <h2 className="card-title">{entry.glaze}</h2>
        </div>
      </Link>
    );
  }
  return (
    <div className="card combo-card tile-missing">
      <div className="card-media">
        <div className="card-noimg">No tile yet</div>
      </div>
      <div className="card-content">
        <h2 className="card-title">{entry.glaze}</h2>
        {entry.others > 0 && (
          <p className="card-text">
            <Link to={comboLink(entry.key)}>
              See {entry.others} {entry.others === 1 ? 'tile' : 'tiles'} on other clays or kilns
            </Link>
          </p>
        )}
        {isStudioAdmin && (
          <AddComboButton
            to={`/new?${new URLSearchParams({ tile: entry.glaze, clay, firing })}`}
            className="btn btn-tonal tile-add"
          >
            <Icon name="add_a_photo" /> Add tile
          </AddComboButton>
        )}
      </div>
    </div>
  );
}
