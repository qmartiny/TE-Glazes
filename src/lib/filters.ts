import type { Combo, ComboFilters, FacetRow, Firing, LayerType } from '../types';
import { layerLabel } from './layers';

export const FILTER_KEYS = ['glaze', 'slip', 'oxide', 'clay', 'firing', 'studio', 'user'] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

/** Filters that match a glaze, slip or oxide in any layer. */
export const LAYER_FILTER_KEYS = ['glaze', 'slip', 'oxide'] as const satisfies readonly LayerType[];

export function filtersFromParams(params: URLSearchParams): ComboFilters {
  const filters: ComboFilters = {};
  for (const key of FILTER_KEYS) {
    const value = params.get(key)?.trim();
    if (!value) continue;
    if (key === 'firing') {
      if (value === 'oxidation' || value === 'reduction') filters.firing = value;
    } else {
      filters[key] = value;
    }
  }
  return filters;
}

export function paramsFromFilters(filters: ComboFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = filters[key];
    if (value) params.set(key, value);
  }
  return params;
}

export function hasFilters(filters: ComboFilters): boolean {
  return FILTER_KEYS.some((key) => Boolean(filters[key]));
}

/** Does a combo (or facet row) match every active filter, optionally ignoring one? */
export function matchesFilters(
  row: FacetRow | Combo,
  filters: ComboFilters,
  ignore?: FilterKey,
): boolean {
  if (ignore !== 'clay' && filters.clay && row.clay !== filters.clay) return false;
  if (ignore !== 'firing' && filters.firing && row.firing !== filters.firing) return false;
  if (ignore !== 'studio' && filters.studio && row.studio !== filters.studio) return false;
  if (ignore !== 'user' && filters.user && row.userId !== filters.user) return false;
  for (const type of LAYER_FILTER_KEYS) {
    const name = filters[type];
    if (ignore !== type && name && !row.layers.some((l) => l.type === type && l.name === name)) return false;
  }
  return true;
}

export type Counts = Map<string, number>;

export interface Facets {
  glaze: Counts;
  slip: Counts;
  oxide: Counts;
  clay: Counts;
  firing: Counts;
  studio: Counts;
  user: Counts;
}

function bump(counts: Counts, key: string | null | undefined) {
  if (!key) return;
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

/**
 * Counts for each filter dropdown. Each dimension is counted against the
 * other active filters, so "Tenmoku (3)" means 3 results if you pick it now.
 */
export function computeFacets(rows: FacetRow[], filters: ComboFilters): Facets {
  const facets: Facets = {
    glaze: new Map(),
    slip: new Map(),
    oxide: new Map(),
    clay: new Map(),
    firing: new Map(),
    studio: new Map(),
    user: new Map(),
  };
  for (const row of rows) {
    for (const type of LAYER_FILTER_KEYS) {
      if (!matchesFilters(row, filters, type)) continue;
      // A glaze used twice in one combo still counts that combo once.
      const names = new Set(row.layers.filter((l) => l.type === type).map((l) => l.name));
      for (const name of names) bump(facets[type], name);
    }
    if (matchesFilters(row, filters, 'clay')) bump(facets.clay, row.clay);
    if (matchesFilters(row, filters, 'firing')) bump(facets.firing, row.firing);
    if (matchesFilters(row, filters, 'studio')) bump(facets.studio, row.studio);
    if (matchesFilters(row, filters, 'user')) bump(facets.user, row.userId);
  }
  return facets;
}

export interface Option {
  value: string;
  label: string;
  count: number;
}

/**
 * Studio defaults first (in the order they're configured), then any other
 * values people have typed in, alphabetically.
 */
export function buildOptions(defaults: readonly string[], counts: Counts, selected?: string): Option[] {
  const seen = new Set<string>();
  const options: Option[] = [];
  for (const value of defaults) {
    if (seen.has(value)) continue;
    seen.add(value);
    options.push({ value, label: value, count: counts.get(value) ?? 0 });
  }
  const extras = [...counts.keys()].filter((v) => !seen.has(v));
  if (selected && !seen.has(selected) && !counts.has(selected)) extras.push(selected);
  extras.sort((a, b) => a.localeCompare(b));
  for (const value of extras) options.push({ value, label: value, count: counts.get(value) ?? 0 });
  return options;
}

export function firingLabel(firing: Firing): string {
  return firing === 'oxidation' ? 'Oxidation' : 'Reduction';
}

export function comboTitle(combo: Pick<Combo, 'title' | 'layers'>): string {
  if (combo.title?.trim()) return combo.title.trim();
  return combo.layers.map(layerLabel).join(' + ') || 'Untitled combo';
}
