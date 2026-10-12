import { describe, expect, it } from 'vitest';
import type { Firing, Layer, ResultSummary } from '../types';
import { tileEntries } from './tiles';

const glaze = (name: string): Layer => ({ type: 'glaze', name, application: null });

let n = 0;
function post(layers: Layer[], firing: Firing, official: boolean, createdAt: string): ResultSummary {
  return {
    id: `r${n++}`,
    userId: 'u',
    clays: [{ name: 'Craft Crank', percent: null }],
    firing,
    layers,
    description: null,
    photos: [],
    isPrivate: false,
    official,
    createdAt,
  };
}

describe('tileEntries', () => {
  const results = [
    post([glaze('Tenmoku')], 'reduction', true, '2026-06-01'),
    post([glaze('tenmoku')], 'reduction', true, '2026-07-01'), // newer tile for the same glaze and kiln
    post([glaze('Tenmoku')], 'oxidation', true, '2026-06-02'),
    post([glaze('Honey')], 'oxidation', false, '2026-06-03'), // a member's post, not a studio tile
    post([glaze('Honey'), glaze('Tenmoku')], 'oxidation', true, '2026-06-04'), // not a single glaze
    post([glaze('Ash Green')], 'reduction', true, '2026-06-05'), // not in the studio list
  ];

  it('lists every studio glaze in order, then other glazes with tiles', () => {
    expect(tileEntries(results, 'reduction', ['Shiny White', 'Tenmoku', 'Honey']).map((e) => e.glaze)).toEqual([
      'Shiny White',
      'Tenmoku',
      'Honey',
      'Ash Green',
    ]);
  });

  it('shows the newest studio tile in the chosen kiln, and which kilns have one', () => {
    const [, tenmoku, honey] = tileEntries(results, 'reduction', ['Shiny White', 'Tenmoku', 'Honey']);
    expect(tenmoku.tile?.createdAt).toBe('2026-07-01');
    expect(tenmoku.kilns.sort()).toEqual(['oxidation', 'reduction']);
    expect(tenmoku.key).toBe('glaze:tenmoku');
    expect(honey.tile).toBeNull();
    expect(tileEntries(results, 'oxidation', ['Tenmoku'])[0].tile?.createdAt).toBe('2026-06-02');
  });
});
