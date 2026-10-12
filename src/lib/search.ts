import type { ComboFilters } from '../types';
import { firingLabel, type FacetKey, type Facets } from './filters';
import { normName } from './layers';

export interface Suggestion {
  kind: FacetKey;
  /** What the filter is set to (a member's id for "user"). */
  value: string;
  label: string;
  /** Combos you'd get by picking it, given the other filters. */
  count: number;
}

export const KIND_LABELS: Record<FacetKey, string> = {
  glaze: 'Glaze',
  slip: 'Slip',
  oxide: 'Oxide',
  clay: 'Clay',
  firing: 'Firing',
  user: 'Member',
};

/**
 * Autocomplete for the search box: glazes, slips, oxides, clays, firings and
 * members whose name contains what's typed, best matches first. Typing a kind
 * ("slip", "oxide") lists everything of that kind.
 */
export function suggest(
  query: string,
  facets: Facets,
  names: Map<string, string>,
  filters: ComboFilters,
  limit = 8,
): Suggestion[] {
  const q = normName(query);
  if (!q) return [];
  const scored: { s: Suggestion; score: number }[] = [];
  for (const kind of Object.keys(KIND_LABELS) as FacetKey[]) {
    for (const [value, count] of facets[kind]) {
      if (!count || filters[kind] === value) continue;
      const label = kind === 'user' ? names.get(value) : kind === 'firing' ? firingLabel(value as 'oxidation') : value;
      if (!label) continue;
      const name = normName(label);
      const score = name.startsWith(q)
        ? 0
        : name.split(' ').some((w) => w.startsWith(q))
          ? 1
          : `${name} ${normName(KIND_LABELS[kind])}`.includes(q)
            ? 2
            : -1;
      if (score >= 0) scored.push({ s: { kind, value, label, count }, score });
    }
  }
  return scored
    .sort((a, b) => a.score - b.score || b.s.count - a.s.count || a.s.label.localeCompare(b.s.label))
    .slice(0, limit)
    .map((x) => x.s);
}
