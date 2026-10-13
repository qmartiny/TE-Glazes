import { describe, expect, it } from 'vitest';
import type { Firing, Layer, ResultSummary } from '../types';
import {
  clayTileCounts,
  glazeTileCounts,
  glazeTileEntries,
  sortStudioTiles,
  studioTileCounts,
  tileEntries,
} from './tiles';

const glaze = (name: string): Layer => ({ type: 'glaze', name, application: null });

let n = 0;
function post(clay: string, layers: Layer[], firing: Firing, official: boolean, createdAt: string): ResultSummary {
  return {
    id: `r${n++}`,
    userId: 'u',
    clays: [{ name: clay, percent: null }],
    firing,
    layers,
    description: null,
    photos: [],
    isPrivate: false,
    official,
    createdAt,
  };
}

const results = [
  post('Craft Crank', [glaze('Tenmoku')], 'reduction', true, '2026-06-01'),
  post('craft crank', [glaze('tenmoku')], 'reduction', true, '2026-07-01'), // newer tile, same clay and kiln
  post('Craft Crank', [glaze('Tenmoku')], 'oxidation', true, '2026-06-02'),
  post('Porcelain', [glaze('Tenmoku')], 'reduction', true, '2026-06-03'),
  post('Porcelain', [glaze('Honey')], 'reduction', false, '2026-06-03'), // a member's post, not a studio tile
  post('Craft Crank', [glaze('Honey'), glaze('Tenmoku')], 'reduction', true, '2026-06-04'), // not a single glaze
  post('Craft Crank', [glaze('Ash Green')], 'reduction', true, '2026-06-05'), // not in the studio list
  post('Paper Clay', [glaze('Honey')], 'reduction', true, '2026-06-06'), // not a listed clay
];
const GLAZES = ['Shiny White', 'Tenmoku', 'Honey'];

describe('tileEntries', () => {
  it('lists every studio glaze in order, then other glazes with tiles', () => {
    expect(tileEntries(results, 'Craft Crank', 'reduction', GLAZES).map((e) => e.glaze)).toEqual([
      'Shiny White',
      'Tenmoku',
      'Honey',
      'Ash Green',
    ]);
  });

  it('shows the newest tile on the chosen clay in the chosen kiln', () => {
    const [white, tenmoku, honey] = tileEntries(results, 'Craft Crank', 'reduction', GLAZES);
    expect(white.tile).toBeNull();
    expect(tenmoku.tile?.createdAt).toBe('2026-07-01');
    expect(tenmoku.key).toBe('glaze:tenmoku');
    expect(honey.tile).toBeNull();
    expect(tileEntries(results, 'Porcelain', 'reduction', GLAZES)[1].tile?.clays[0].name).toBe('Porcelain');
    expect(tileEntries(results, 'Craft Crank', 'oxidation', GLAZES)[1].tile?.createdAt).toBe('2026-06-02');
  });

  it('counts the tiles a glaze has elsewhere', () => {
    const [, tenmoku, honey] = tileEntries(results, 'Craft Crank', 'reduction', GLAZES);
    expect(tenmoku.others).toBe(2); // electric on Craft Crank, gas on Porcelain
    expect(honey.others).toBe(1); // gas on Paper Clay
  });
});

describe('clayTileCounts', () => {
  it('counts glazes with a tile per clay, in this kiln, with unlisted clays last', () => {
    expect(clayTileCounts(results, 'reduction', ['Porcelain', 'Craft Crank', 'Reclaim'])).toEqual([
      { clay: 'Porcelain', count: 1 },
      { clay: 'Craft Crank', count: 2 }, // Tenmoku and Ash Green
      { clay: 'Reclaim', count: 0 },
      { clay: 'Paper Clay', count: 1 },
    ]);
  });
});

describe('glazeTileEntries', () => {
  it('shows the glaze on every clay, newest tile per clay, unlisted clays last', () => {
    const entries = glazeTileEntries(results, 'tenmoku', 'reduction', ['Porcelain', 'Craft Crank', 'Reclaim']);
    expect(entries.map((e) => [e.clay, e.tile?.createdAt ?? null, e.otherKiln])).toEqual([
      ['Porcelain', '2026-06-03', false],
      ['Craft Crank', '2026-07-01', true],
      ['Reclaim', null, false],
    ]);
    expect(glazeTileEntries(results, 'Honey', 'reduction', ['Porcelain']).map((e) => e.clay)).toEqual([
      'Porcelain',
      'Paper Clay',
    ]);
  });
});

describe('glazeTileCounts', () => {
  it('counts the clays each glaze has a tile on, in this kiln', () => {
    expect(glazeTileCounts(results, 'reduction', ['Tenmoku', 'Honey', 'Cotton'])).toEqual([
      { glaze: 'Tenmoku', count: 2 },
      { glaze: 'Honey', count: 1 },
      { glaze: 'Cotton', count: 0 },
      { glaze: 'Ash Green', count: 1 },
    ]);
  });

  it('counts all studio tiles per glaze for combo pages', () => {
    expect(studioTileCounts(results).get('tenmoku')).toBe(4);
    expect(studioTileCounts(results).has('cotton')).toBe(false);
  });
});

describe('sortStudioTiles', () => {
  it("orders by the studio's clay list, then electric before gas", () => {
    const tiles = results.filter((r) => r.official && r.layers.length === 1);
    const order = sortStudioTiles(tiles, ['Porcelain', 'Craft Crank']).map((t) => `${t.clays[0].name}/${t.firing}`);
    expect(order).toEqual([
      'Porcelain/reduction',
      'Craft Crank/oxidation',
      'Craft Crank/reduction',
      'craft crank/reduction',
      'Craft Crank/reduction',
      'Paper Clay/reduction',
    ]);
  });
});
