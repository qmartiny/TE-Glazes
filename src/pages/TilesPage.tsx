import { useEffect, useMemo, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { AddComboButton } from '../components/AddComboButton';
import { CardMedia, GridSkeleton, LoadError, glazeLink } from '../components/Cards';
import { Icon } from '../components/Icon';
import { PickerField } from '../components/PickerField';
import { CLAYS, FIRINGS, GLAZES } from '../config';
import { normalizeClays } from '../lib/clays';
import { firingLabel } from '../lib/filters';
import { readPref, writePref } from '../lib/format';
import { useResults } from '../lib/results';
import { clayTileCounts, glazeTileCounts, glazeTileEntries, tileEntries } from '../lib/tiles';
import type { ClayPart, Firing, ResultSummary } from '../types';

type View = 'clay' | 'glaze';

interface Viewed {
  by?: View;
  clay?: string;
  glaze?: string;
  firing?: Firing;
}

interface Count {
  name: string;
  count: number;
}

/** The one you looked at last, else the one you post with (clays), else the one with the most tiles. */
function pick(counts: Count[], viewed: string | undefined, fallback: string, yours?: string): string {
  const has = (name: string | undefined) => counts.find((c) => c.name === name);
  if (has(viewed)) return viewed!;
  if (has(yours)?.count) return yours!;
  const most = [...counts].sort((a, b) => b.count - a.count)[0];
  return most?.count ? most.name : fallback;
}

function yourClay(): string | undefined {
  const last = readPref<{ clays?: ClayPart[]; clay?: string }>('last');
  return normalizeClays(last?.clays, last?.clay)[0]?.name;
}

/**
 * The studio's test tiles, one kiln at a time: every glaze on one clay, or
 * one glaze on every clay.
 */
export function TilesPage() {
  const [params, setParams] = useSearchParams();
  // A link can say what to show; otherwise carry on where you left off.
  const viewed = readPref<Viewed>('tiles') ?? {};
  const by: View = params.has('glaze') ? 'glaze' : params.has('clay') ? 'clay' : (viewed.by ?? 'clay');
  const firing: Firing =
    FIRINGS.find((f) => f.value === (params.get('firing') ?? viewed.firing))?.value ?? FIRINGS[0].value;

  const { results, error, retry } = useResults();
  const clayCounts = useMemo(
    () => (results ? clayTileCounts(results, firing, CLAYS).map((c) => ({ name: c.clay, count: c.count })) : null),
    [results, firing],
  );
  const glazeCounts = useMemo(
    () => (results ? glazeTileCounts(results, firing, GLAZES).map((g) => ({ name: g.glaze, count: g.count })) : null),
    [results, firing],
  );
  const clay = params.get('clay') ?? (clayCounts ? pick(clayCounts, viewed.clay, CLAYS[0], yourClay()) : CLAYS[0]);
  const glaze = params.get('glaze') ?? (glazeCounts ? pick(glazeCounts, viewed.glaze, GLAZES[0]) : GLAZES[0]);

  useEffect(() => {
    if (results) writePref('tiles', { by, clay, glaze, firing } satisfies Viewed);
  }, [results, by, clay, glaze, firing]);

  // flushSync: apply right away so the controls never show the old choice.
  const choose = (next: Viewed) => {
    const nextBy = next.by ?? by;
    setParams(
      {
        ...(nextBy === 'clay' ? { clay: next.clay ?? clay } : { glaze: next.glaze ?? glaze }),
        firing: next.firing ?? firing,
      },
      { replace: true, flushSync: true },
    );
  };

  let body;
  if (error && !results) body = <LoadError error={error} retry={retry} />;
  else if (!results) body = <GridSkeleton />;
  else if (by === 'clay') {
    const entries = tileEntries(results, clay, firing, GLAZES);
    body = (
      <>
        <div className="grid">
          {entries.map((e) => (
            <TileCard
              key={e.key}
              title={e.glaze}
              tile={e.tile}
              add={{ tile: e.glaze, clay, firing }}
              note={
                e.others > 0 && (
                  <Link to={`/tiles?${new URLSearchParams({ glaze: e.glaze, firing })}`}>See it on other clays</Link>
                )
              }
            />
          ))}
        </div>
      </>
    );
  } else {
    const entries = glazeTileEntries(results, glaze, firing, CLAYS);
    const other = FIRINGS.find((f) => f.value !== firing)!;
    body = (
      <>
        <p className="tiles-glaze-link">
          <Link to={glazeLink(glaze)}>
            Combos with {glaze}
            <Icon name="chevron_right" />
          </Link>
        </p>
        <div className="grid">
          {entries.map((e) => (
            <TileCard
              key={e.clay}
              title={e.clay}
              tile={e.tile}
              add={{ tile: glaze, clay: e.clay, firing }}
              note={e.otherKiln && `${firingLabel(other.value)} tile only`}
            />
          ))}
        </div>
      </>
    );
  }

  const counts = by === 'clay' ? clayCounts : glazeCounts;
  const current = by === 'clay' ? clay : glaze;

  return (
    <>
      <section className="intro">
        <h1 className="page-title">Studio test tiles</h1>
      </section>

      <div className="tabs tiles-tabs" role="tablist" aria-label="Show tiles">
        {(['clay', 'glaze'] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={by === v}
            className={`tab${by === v ? ' selected' : ''}`}
            onClick={() => choose({ by: v })}
          >
            {v === 'clay' ? 'By clay' : 'By glaze'}
          </button>
        ))}
      </div>
      <div className="tiles-controls">
        <PickerField
          key={by}
          id="tiles-pick"
          label={by === 'clay' ? 'Clay' : 'Glaze'}
          aria-label={by === 'clay' ? 'Clay' : 'Glaze'}
          value={current}
          options={(counts ?? []).map((c) => c.name)}
          onChange={(v) => choose(by === 'clay' ? { clay: v } : { glaze: v })}
        />
        <Segmented
          label="Kiln"
          name="tiles-firing"
          value={firing}
          options={FIRINGS}
          onChange={(v) => choose({ firing: v })}
        />
      </div>
      {body}
    </>
  );
}

function Segmented<T extends string>({
  label,
  name,
  value,
  options,
  onChange,
}: {
  label: string;
  name: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <label key={o.value} className={`segment${value === o.value ? ' selected' : ''}`}>
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
          />
          {value === o.value && <Icon name="check" />}
          {o.label}
        </label>
      ))}
    </div>
  );
}

/** A studio tile, or a gap: "No tile yet", with Add tile for the studio team. */
function TileCard({
  title,
  tile,
  add,
  note,
}: {
  title: string;
  tile: ResultSummary | null;
  /** What "Add tile" fills in. */
  add: { tile: string; clay: string; firing: Firing };
  note: ReactNode;
}) {
  const { isStudioAdmin } = useAuth();
  if (tile) {
    return (
      <Link to={`/c/${tile.id}`} className="card combo-card">
        <CardMedia photo={tile.photos[0]} badges={null} />
        <div className="card-content">
          <h2 className="card-title">{title}</h2>
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
        <h2 className="card-title">{title}</h2>
        {note && <p className="card-text">{note}</p>}
        {isStudioAdmin && (
          <AddComboButton to={`/new?${new URLSearchParams(add)}`} className="btn btn-tonal tile-add">
            <Icon name="add_a_photo" /> Add tile
          </AddComboButton>
        )}
      </div>
    </div>
  );
}
