import { FIRINGS } from '../config';
import type { ClayPart, Firing, ResultSummary } from '../types';
import { clayNames } from './clays';
import { comboKey, normName } from './layers';

// The studio fires a test tile of every glaze on every clay, in both kilns,
// so the Test tiles page shows one clay and one kiln at a time.

export interface TileEntry {
  glaze: string;
  /** The combo page for this glaze on its own. */
  key: string;
  /** The newest studio tile for this glaze on the chosen clay, in the chosen kiln. */
  tile: ResultSummary | null;
  /** How many studio tiles this glaze has on other clays or in the other kiln. */
  others: number;
}

/** A studio tile is an official post of one glaze on its own. */
export function isStudioTile(r: ResultSummary): boolean {
  return r.official && r.layers.length === 1 && r.layers[0].type === 'glaze';
}

const onClay = (r: { clays: ClayPart[] }, clay: string) =>
  clayNames(r.clays).some((c) => normName(c) === normName(clay));

/** Listed names in order, then any others that turn up, alphabetically. */
function withExtras(listed: readonly string[], found: string[]): string[] {
  const known = new Set(listed.map(normName));
  const extras = new Map<string, string>();
  for (const name of found) if (!known.has(normName(name))) extras.set(normName(name), name);
  return [...listed, ...[...extras.values()].sort((a, b) => a.localeCompare(b))];
}

/**
 * One entry per glaze for the chosen clay and kiln: the studio's glazes in
 * their usual order, then any other glaze that has a studio tile.
 */
export function tileEntries(
  results: ResultSummary[],
  clay: string,
  firing: Firing,
  glazes: readonly string[],
): TileEntry[] {
  const tiles = results.filter(isStudioTile);
  return withExtras(
    glazes,
    tiles.map((t) => t.layers[0].name),
  ).map((glaze) => {
    const mine = tiles.filter((t) => normName(t.layers[0].name) === normName(glaze));
    const here = mine
      .filter((t) => t.firing === firing && onClay(t, clay))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return {
      glaze,
      key: comboKey([{ type: 'glaze', name: glaze }]),
      tile: here[0] ?? null,
      others: mine.length - here.length,
    };
  });
}

/** Each clay, with how many glazes have a studio tile on it in this kiln. */
export function clayTileCounts(
  results: ResultSummary[],
  firing: Firing,
  clays: readonly string[],
): { clay: string; count: number }[] {
  const tiles = results.filter((r) => isStudioTile(r) && r.firing === firing);
  return withExtras(
    clays,
    tiles.flatMap((t) => clayNames(t.clays)),
  ).map((clay) => ({
    clay,
    count: new Set(tiles.filter((t) => onClay(t, clay)).map((t) => normName(t.layers[0].name))).size,
  }));
}

/** Studio tiles in the studio's clay order, electric kiln before gas. */
export function sortStudioTiles<T extends { clays: ClayPart[]; firing: Firing }>(
  tiles: T[],
  clays: readonly string[],
): T[] {
  const rank = (t: T) => {
    const i = clays.findIndex((c) => normName(c) === normName(t.clays[0]?.name ?? ''));
    return i < 0 ? clays.length : i;
  };
  const kiln = (t: T) => FIRINGS.findIndex((f) => f.value === t.firing);
  return [...tiles].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      (a.clays[0]?.name ?? '').localeCompare(b.clays[0]?.name ?? '', undefined, { sensitivity: 'base' }) ||
      kiln(a) - kiln(b),
  );
}
