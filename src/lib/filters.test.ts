import { describe, expect, it } from 'vitest';
import type { ClayPart, Firing, Layer, ResultSummary } from '../types';
import {
  buildOptions,
  computeFacets,
  filterGroups,
  filtersFromParams,
  firingsLabel,
  groupResults,
  groupTitle,
  paramsFromFilters,
  summarize,
} from './filters';

const glaze = (name: string, application: string | null = null): Layer => ({ type: 'glaze', name, application });
const slip = (name: string): Layer => ({ type: 'slip', name, application: null });
const oxide = (name: string): Layer => ({ type: 'oxide', name, application: null });

let n = 0;
function result(
  userId: string,
  clay: string | ClayPart[],
  firing: Firing,
  layers: Layer[],
  createdAt: string,
): ResultSummary {
  const clays = typeof clay === 'string' ? [{ name: clay, percent: null }] : clay;
  return {
    id: `r${n++}`,
    userId,
    clays,
    firing,
    layers,
    description: null,
    photos: [],
    isPrivate: false,
    official: false,
    createdAt,
  };
}

const results: ResultSummary[] = [
  result('maya', 'Craft Crank', 'reduction', [glaze('Tenmoku', 'Dipped'), glaze('Midnight Blue', 'Poured')], '2026-09-01'),
  // Same layers in the same order, applied differently, different clay/firing and spelling: same combo.
  result('sam', 'Porcelain', 'oxidation', [glaze('tenmoku ', 'Poured'), glaze('Midnight  blue')], '2026-10-01'),
  // Reversed order is a different combo.
  result('jo', 'Craft Crank', 'reduction', [glaze('Midnight Blue'), glaze('Tenmoku')], '2026-08-01'),
  result('jo', 'Porcelain', 'reduction', [slip('Blue'), oxide('Cobalt Oxide'), glaze('Transparent')], '2026-07-01'),
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

describe('groupResults', () => {
  const groups = groupResults(results);

  it('groups posts with the same layers in the same order, ignoring how they were applied and spelling', () => {
    expect(groups.map((g) => g.results.length)).toEqual([2, 1, 1]);
    expect(groups[0].results.map((r) => r.userId)).toEqual(['sam', 'maya']); // newest first
    expect(groupTitle(groups[1])).toBe('Midnight Blue + Tenmoku');
  });

  it("names the combo after the newest post's layers, without application", () => {
    expect(groups[0].layers).toEqual([glaze('tenmoku '), glaze('Midnight  blue')]);
  });
});

describe('filterGroups', () => {
  const groups = groupResults(results);

  it('shows a combo when any of its results matches, with just those results', () => {
    const shown = filterGroups(groups, { clay: 'Porcelain', firing: 'oxidation' });
    expect(shown).toHaveLength(1);
    expect(shown[0].results.map((r) => r.userId)).toEqual(['sam']);
  });

  it('needs a single result to match clay and firing together', () => {
    // Maya: Craft Crank + reduction; Sam: Porcelain + oxidation. Nobody did Craft Crank in oxidation.
    expect(filterGroups(groups, { clay: 'Craft Crank', firing: 'oxidation' })).toHaveLength(0);
  });

  it('matches glazes, slips and oxides by type, ignoring case', () => {
    expect(filterGroups(groups, { glaze: 'midnight blue' })).toHaveLength(2);
    expect(filterGroups(groups, { slip: 'Blue', oxide: 'Cobalt Oxide' })).toHaveLength(1);
    expect(filterGroups(groups, { glaze: 'Blue' })).toHaveLength(0);
  });
});

describe('clay mixes', () => {
  const mixGroups = groupResults([
    result(
      'kim',
      [
        { name: 'Craft Crank', percent: 50 },
        { name: 'Reclaim', percent: 50 },
      ],
      'oxidation',
      [glaze('Honey')],
      '2026-10-02',
    ),
    result('lee', 'Reclaim', 'oxidation', [glaze('Honey')], '2026-10-01'),
  ]);

  it('finds a mix under each of its clays', () => {
    expect(filterGroups(mixGroups, { clay: 'craft crank' })[0].results.map((r) => r.userId)).toEqual(['kim']);
    expect(filterGroups(mixGroups, { clay: 'Reclaim' })[0].results.map((r) => r.userId)).toEqual(['kim', 'lee']);
  });

  it('counts each clay of a mix, once per combo', () => {
    const facets = computeFacets(mixGroups, {});
    expect(facets.clay.get('Craft Crank')).toBe(1);
    expect(facets.clay.get('Reclaim')).toBe(1);
  });

  it('searches the clays in a mix', () => {
    expect(filterGroups(mixGroups, { q: 'crank honey' })).toHaveLength(1);
  });
});

describe('computeFacets', () => {
  const groups = groupResults(results);

  it('counts combos, not posts', () => {
    const facets = computeFacets(groups, {});
    expect(facets.glaze.get('Tenmoku')).toBe(1); // the reversed combo
    expect(facets.firing.get('reduction')).toBe(3);
    expect(facets.firing.get('oxidation')).toBe(1);
  });

  it('counts each dimension against the other active filters', () => {
    const facets = computeFacets(groups, { firing: 'oxidation' });
    expect(facets.clay.get('Porcelain')).toBe(1);
    expect(facets.clay.has('Craft Crank')).toBe(false);
    expect(facets.firing.get('reduction')).toBe(3); // the firing facet ignores the firing filter
    expect(facets.slip.has('Blue')).toBe(false);
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

describe('labels', () => {
  it('names a combo after its layers', () => {
    expect(groupTitle({ layers: [glaze('Tenmoku'), glaze('Midnight Blue')] })).toBe('Tenmoku + Midnight Blue');
    expect(groupTitle({ layers: [slip('Blue'), oxide('Cobalt Oxide')] })).toBe('Blue slip + Cobalt Oxide');
  });

  it('calls firings by the kiln', () => {
    expect(firingsLabel(['oxidation'])).toBe('Electric kiln');
    expect(firingsLabel(['reduction', 'reduction'])).toBe('Gas kiln');
    expect(firingsLabel(['oxidation', 'reduction'])).toBe('Electric & gas kiln');
  });

  it('summarizes lists', () => {
    expect(summarize(['A', 'A', 'B'])).toBe('A, B');
    expect(summarize(['A', 'B', 'C', 'D'])).toBe('A, B +2');
  });
});
