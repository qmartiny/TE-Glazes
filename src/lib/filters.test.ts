import { describe, expect, it } from 'vitest';
import type { FacetRow } from '../types';
import {
  buildOptions,
  comboTitle,
  computeFacets,
  filtersFromParams,
  matchesFilters,
  paramsFromFilters,
} from './filters';

const rows: FacetRow[] = [
  { userId: 'a', clay: 'Porcelain', firing: 'reduction', studio: 'Hoxton', layers: [{ glaze: 'Celadon', application: null }] },
  {
    userId: 'a',
    clay: 'Buff stoneware',
    firing: 'reduction',
    studio: 'Hoxton',
    layers: [
      { glaze: 'Tenmoku', application: 'Dipped' },
      { glaze: 'Chun Blue', application: 'Poured' },
    ],
  },
  {
    userId: 'b',
    clay: 'Buff stoneware',
    firing: 'oxidation',
    studio: 'Leyton',
    layers: [
      { glaze: 'Tenmoku', application: null },
      { glaze: 'Tenmoku', application: null },
    ],
  },
];

describe('URL params', () => {
  it('round-trips filters and ignores unknown or invalid values', () => {
    const filters = filtersFromParams(new URLSearchParams('glaze=Chun+Blue&firing=raku&clay=&foo=bar&user=a'));
    expect(filters).toEqual({ glaze: 'Chun Blue', user: 'a' });
    expect(filtersFromParams(paramsFromFilters(filters))).toEqual(filters);
  });
});

describe('matchesFilters', () => {
  it('matches a glaze in any layer', () => {
    expect(matchesFilters(rows[1], { glaze: 'Chun Blue' })).toBe(true);
    expect(matchesFilters(rows[0], { glaze: 'Chun Blue' })).toBe(false);
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
    expect(facets.clay.get('Buff stoneware')).toBe(1);
    // The firing facet ignores the firing filter itself.
    expect(facets.firing.get('oxidation')).toBe(1);
    expect(facets.firing.get('reduction')).toBe(2);
  });

  it('counts a glaze once per combo even if used in two layers', () => {
    expect(computeFacets(rows, {}).glaze.get('Tenmoku')).toBe(2);
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
  it('falls back to the glaze names', () => {
    expect(comboTitle({ title: '  ', layers: rows[1].layers })).toBe('Tenmoku + Chun Blue');
    expect(comboTitle({ title: 'Blue rim', layers: rows[1].layers })).toBe('Blue rim');
  });
});
