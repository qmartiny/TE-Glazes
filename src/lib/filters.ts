import type { ComboFilters, Firing, Layer, LayerType, ResultSummary } from '../types';
import { FIRINGS } from '../config';
import { comboKey, layerLabel, normName } from './layers';

export const FILTER_KEYS = ['q', 'glaze', 'slip', 'oxide', 'clay', 'firing', 'user'] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];
/** Filters with a dropdown (everything except free-text search). */
export type FacetKey = Exclude<FilterKey, 'q'>;

/** Filters that match a glaze, slip or oxide in any layer. */
export const LAYER_FILTER_KEYS = ['glaze', 'slip', 'oxide'] as const satisfies readonly LayerType[];

/** Filters that are about a particular result (one member's post). */
const RESULT_FILTER_KEYS = ['clay', 'firing', 'user'] as const;

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

// ---------------------------------------------------------------------------
// Combos: everyone's posts with the same layers, in the same order
// ---------------------------------------------------------------------------

export interface ComboGroup {
  key: string;
  /** The layers as named in the newest post (how each was applied varies per post). */
  layers: Layer[];
  /** Newest first. */
  results: ResultSummary[];
}

export function groupResults(results: ResultSummary[]): ComboGroup[] {
  const sorted = [...results].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const groups = new Map<string, ComboGroup>();
  for (const result of sorted) {
    const key = comboKey(result.layers);
    const group = groups.get(key);
    if (group) group.results.push(result);
    else groups.set(key, { key, layers: result.layers.map((l) => ({ ...l, application: null })), results: [result] });
  }
  return [...groups.values()];
}

export function groupTitle(group: Pick<ComboGroup, 'layers'>): string {
  return group.layers.map(layerLabel).join(' + ') || 'Untitled combo';
}

function layersMatch(layers: Layer[], filters: ComboFilters, ignore?: FilterKey): boolean {
  return LAYER_FILTER_KEYS.every((type) => {
    const wanted = filters[type];
    if (ignore === type || !wanted) return true;
    return layers.some((l) => l.type === type && normName(l.name) === normName(wanted));
  });
}

/** Every word of the search appears in the notes, clay or layer names. */
export function textMatches(result: ResultSummary, layers: Layer[], query: string): boolean {
  const haystack = normName([result.description ?? '', result.clay, ...layers.map(layerLabel)].join(' '));
  return normName(query)
    .split(' ')
    .every((word) => haystack.includes(word));
}

function resultMatches(result: ResultSummary, layers: Layer[], filters: ComboFilters, ignore?: FilterKey): boolean {
  if (ignore !== 'q' && filters.q && !textMatches(result, layers, filters.q)) return false;
  if (ignore !== 'clay' && filters.clay && normName(result.clay) !== normName(filters.clay)) return false;
  if (ignore !== 'firing' && filters.firing && result.firing !== filters.firing) return false;
  if (ignore !== 'user' && filters.user && result.userId !== filters.user) return false;
  return true;
}

/**
 * The results in a combo that satisfy the filters. A combo shows up when at
 * least one person's result matches (e.g. "on Porcelain, in oxidation").
 */
export function matchingResults(group: ComboGroup, filters: ComboFilters, ignore?: FilterKey): ResultSummary[] {
  if (!layersMatch(group.layers, filters, ignore)) return [];
  return group.results.filter((r) => resultMatches(r, group.layers, filters, ignore));
}

export interface FilteredGroup {
  group: ComboGroup;
  /** The group's results that match the filters, newest first. */
  results: ResultSummary[];
}

export function filterGroups(groups: ComboGroup[], filters: ComboFilters): FilteredGroup[] {
  return groups.flatMap((group) => {
    const results = matchingResults(group, filters);
    return results.length ? [{ group, results }] : [];
  });
}

export type Counts = Map<string, number>;
export type Facets = Record<FacetKey, Counts>;

function bump(counts: Counts, key: string) {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

/**
 * Counts for each filter dropdown, in combos. Each dimension is counted
 * against the other active filters, so "Tenmoku (3)" means 3 combos if you
 * pick it now.
 */
export function computeFacets(groups: ComboGroup[], filters: ComboFilters): Facets {
  const facets: Facets = {
    glaze: new Map(),
    slip: new Map(),
    oxide: new Map(),
    clay: new Map(),
    firing: new Map(),
    user: new Map(),
  };
  for (const group of groups) {
    for (const type of LAYER_FILTER_KEYS) {
      if (!matchingResults(group, filters, type).length) continue;
      const names = new Set(group.layers.filter((l) => l.type === type).map((l) => l.name));
      for (const name of names) bump(facets[type], name);
    }
    for (const key of RESULT_FILTER_KEYS) {
      const results = matchingResults(group, filters, key);
      const values = new Set(results.map((r) => (key === 'user' ? r.userId : r[key])));
      for (const value of values) bump(facets[key], value);
    }
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
  return FIRINGS.find((f) => f.value === firing)?.label ?? firing;
}

/** "Craft Crank", "Craft Crank, Porcelain", "Craft Crank, Porcelain +2" */
export function summarize(values: string[], max = 2): string {
  const unique = [...new Set(values)];
  if (unique.length <= max) return unique.join(', ');
  return `${unique.slice(0, max).join(', ')} +${unique.length - max}`;
}

export function firingsLabel(firings: Firing[]): string {
  const unique = [...new Set(firings)];
  return unique.length > 1 ? 'Electric & gas kiln' : firingLabel(unique[0] ?? 'oxidation');
}
