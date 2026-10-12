import type { Firing, ResultSummary } from '../types';
import { comboKey, normName } from './layers';

export interface TileEntry {
  glaze: string;
  /** The combo page for this glaze on its own. */
  key: string;
  /** The newest studio tile for this glaze in the chosen kiln, if any. */
  tile: ResultSummary | null;
  /** Kilns this glaze has a studio tile for. */
  kilns: Firing[];
}

/** A studio tile is an official post of one glaze on its own. */
export function isStudioTile(r: ResultSummary): boolean {
  return r.official && r.layers.length === 1 && r.layers[0].type === 'glaze';
}

/**
 * One entry per glaze for the Test tiles page: the studio's glazes in their
 * usual order, then any other glaze that has a studio tile.
 */
export function tileEntries(results: ResultSummary[], firing: Firing, glazes: readonly string[]): TileEntry[] {
  const byGlaze = new Map<string, ResultSummary[]>();
  for (const r of results) {
    if (!isStudioTile(r)) continue;
    const k = normName(r.layers[0].name);
    byGlaze.set(k, [...(byGlaze.get(k) ?? []), r]);
  }
  const known = new Set(glazes.map(normName));
  const extras = [...byGlaze.values()]
    .map((tiles) => tiles[0].layers[0].name)
    .filter((name) => !known.has(normName(name)))
    .sort((a, b) => a.localeCompare(b));

  return [...glazes, ...extras].map((glaze) => {
    const tiles = byGlaze.get(normName(glaze)) ?? [];
    const inKiln = tiles.filter((t) => t.firing === firing).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return {
      glaze,
      key: comboKey([{ type: 'glaze', name: glaze }]),
      tile: inKiln[0] ?? null,
      kilns: [...new Set(tiles.map((t) => t.firing))],
    };
  });
}
