import { describe, expect, it } from 'vitest';
import type { Firing, Layer, ResultSummary } from '../types';
import { computeFacets, filterGroups, groupResults } from './filters';
import { suggest } from './search';

const glaze = (name: string): Layer => ({ type: 'glaze', name, application: null });
const slip = (name: string): Layer => ({ type: 'slip', name, application: null });

let n = 0;
function result(userId: string, clay: string, firing: Firing, layers: Layer[], description: string | null = null): ResultSummary {
  return { id: `r${n++}`, userId, clay, firing, layers, description, photos: [], isPrivate: false, createdAt: `2026-10-0${n}` };
}

const results = [
  result('maya', 'Craft Crank', 'reduction', [glaze('Tenmoku'), glaze('Midnight Blue')], 'Runny! Keep it off the foot.'),
  result('sam', 'Porcelain', 'oxidation', [glaze('Tenmoku'), glaze('Midnight Blue')]),
  result('sam', 'Porcelain', 'reduction', [glaze('Monet Blue')]),
  result('jo', 'Draycott', 'reduction', [slip('Blue'), glaze('Transparent')], 'Brushed slip, crawled a bit'),
];
const groups = groupResults(results);
const names = new Map([
  ['maya', 'Maya'],
  ['sam', 'Sam'],
  ['jo', 'Jo Tenby'],
]);

describe('suggest', () => {
  const facets = computeFacets(groups, {});

  it('finds glazes, slips, clays and members, best matches first, with combo counts', () => {
    const s = suggest('blue', facets, names, {});
    expect(s.map((x) => `${x.kind}:${x.label}:${x.count}`)).toEqual([
      'slip:Blue:1', // starts with "blue"
      'glaze:Midnight Blue:1', // a word starts with "blue", then by count and name
      'glaze:Monet Blue:1',
    ]);
  });

  it('matches the start of any word, and members by name', () => {
    expect(suggest('ten', facets, names, {}).map((x) => `${x.kind}:${x.label}`)).toEqual([
      'glaze:Tenmoku',
      'user:Jo Tenby',
    ]);
  });

  it('suggests kilns by their everyday names', () => {
    expect(suggest('gas', facets, names, {}).map((x) => `${x.kind}:${x.value}:${x.label}`)).toEqual([
      'firing:reduction:Gas kiln',
    ]);
    expect(suggest('kiln', facets, names, {}).map((x) => x.label)).toEqual(['Gas kiln', 'Electric kiln']);
  });

  it('lists everything of a kind when you type the kind', () => {
    expect(suggest('slip', facets, names, {}).map((x) => x.label)).toEqual(['Blue']);
  });

  it('leaves out filters that are already on, and things with no combos', () => {
    expect(suggest('tenmoku', facets, names, { glaze: 'Tenmoku' })).toEqual([]);
    expect(suggest('shino', facets, names, {})).toEqual([]);
    expect(suggest('  ', facets, names, {})).toEqual([]);
  });

  it('counts within the other filters', () => {
    const inOxidation = computeFacets(groups, { firing: 'oxidation' });
    expect(suggest('porc', inOxidation, names, { firing: 'oxidation' })).toEqual([
      { kind: 'clay', value: 'Porcelain', label: 'Porcelain', count: 1 },
    ]);
  });
});

describe('free-text search', () => {
  const titles = (q: string) => filterGroups(groups, { q }).map((g) => g.group.layers.map((l) => l.name).join('+'));

  it('matches words in the notes, clay or layer names, ignoring case', () => {
    expect(titles('runny')).toEqual(['Tenmoku+Midnight Blue']);
    expect(titles('CRAWLED')).toEqual(['Blue+Transparent']);
    expect(titles('draycott')).toEqual(['Blue+Transparent']);
  });

  it('needs every word, though not next to each other', () => {
    expect(titles('slip crawled')).toEqual(['Blue+Transparent']);
    expect(titles('runny crawled')).toEqual([]);
  });

  it('only keeps the results whose notes match', () => {
    const [match] = filterGroups(groups, { q: 'runny' });
    expect(match.results.map((r) => r.userId)).toEqual(['maya']);
  });
});
