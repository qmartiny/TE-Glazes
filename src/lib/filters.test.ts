import { describe, expect, it } from 'vitest';
import type { FacetRow, Layer } from '../types';
import {
  buildOptions,
  comboTitle,
  computeFacets,
  filtersFromParams,
  matchesFilters,
  paramsFromFilters,
} from './filters';

const glaze = (name: string, application: string | null = null): Layer => ({ type: 'glaze', name, application });

const rows: FacetRow[] = [
  { userId: 'a', clay: 'Porcelain', firing: 'reduction', layers: [glaze('Faux Celadon')] },
  {
    userId: 'a',
    clay: 'Craft Crank',
    firing: 'reduction',
    layers: [glaze('Tenmoku', 'Dipped'), glaze('Midnight Blue', 'Poured')],
  },
  {
    userId: 'b',
    clay: 'Craft Crank',
    firing: 'oxidation',
    layers: [
      { type: 'slip', name: 'Blue', application: 'Brushed' },
      { type: 'oxide', name: 'Cobalt Oxide', application: null },
      glaze('Tenmoku'),
      glaze('Tenmoku'),
    ],
  },
];

describe('URL params', () => {
  it('round-trips filters and ignores unknown or invalid values', () => {
    const filters = filtersFromParams(
      new URLSearchParams('glaze=Midnight+Blue&slip=Blue&firing=raku&clay=&foo=bar&user=a'),
    );
    expect(filters).toEqual({ glaze: 'Midnight Blue', slip: 'Blue', user: 'a' });
    expect(filtersFromParams(paramsFromFilters(filters))).toEqual(filters);
  });
});

describe('matchesFilters', () => {
  it('matches a glaze in any layer', () => {
    expect(matchesFilters(rows[1], { glaze: 'Midnight Blue' })).toBe(true);
    expect(matchesFilters(rows[0], { glaze: 'Midnight Blue' })).toBe(false);
  });

  it('matches slips and oxides by type, not just name', () => {
    expect(matchesFilters(rows[2], { slip: 'Blue', oxide: 'Cobalt Oxide' })).toBe(true);
    expect(matchesFilters(rows[2], { glaze: 'Blue' })).toBe(false);
    expect(matchesFilters(rows[1], { slip: 'Blue' })).toBe(false);
  });

  it('requires every filter to match', () => {
    expect(matchesFilters(rows[1], { glaze: 'Tenmoku', firing: 'oxidation' })).toBe(false);
    expect(matchesFilters(rows[2], { glaze: 'Tenmoku', firing: 'oxidation' })).toBe(true);
  });
});

describe('computeFacets', () => {
  it('counts each dimension against the other active filters', () => {
    const facets = computeFacets(rows, { firing: 'reduction' });
    expect(facets.glaze.get('Tenmoku')).toBe(1);
    expect(facets.clay.get('Craft Crank')).toBe(1);
    expect(facets.slip.get('Blue')).toBeUndefined();
    // The firing facet ignores the firing filter itself.
    expect(facets.firing.get('oxidation')).toBe(1);
    expect(facets.firing.get('reduction')).toBe(2);
  });

  it('counts a glaze once per combo even if used in two layers', () => {
    expect(computeFacets(rows, {}).glaze.get('Tenmoku')).toBe(2);
  });

  it('counts slips and oxides separately from glazes', () => {
    const facets = computeFacets(rows, {});
    expect(facets.slip.get('Blue')).toBe(1);
    expect(facets.oxide.get('Cobalt Oxide')).toBe(1);
    expect(facets.glaze.has('Blue')).toBe(false);
  });
});

describe('buildOptions', () => {
  it('lists defaults in order, then other used values alphabetically', () => {
    const counts = new Map([
      ['Zebra', 1],
      ['Clear', 3],
      ['Apple', 2],
    ]);
    expect(buildOptions(['Clear', 'Shino'], counts).map((o) => [o.value, o.count])).toEqual([
      ['Clear', 3],
      ['Shino', 0],
      ['Apple', 2],
      ['Zebra', 1],
    ]);
  });

  it('keeps the selected value even when nothing uses it', () => {
    expect(buildOptions([], new Map(), 'Gone').map((o) => o.value)).toEqual(['Gone']);
  });
});

describe('comboTitle', () => {
  it('falls back to the layer names', () => {
    expect(comboTitle({ title: '  ', layers: rows[1].layers })).toBe('Tenmoku + Midnight Blue');
    expect(comboTitle({ title: null, layers: rows[2].layers.slice(0, 3) })).toBe('Blue slip + Cobalt Oxide + Tenmoku');
    expect(comboTitle({ title: 'Blue rim', layers: rows[1].layers })).toBe('Blue rim');
  });
});
