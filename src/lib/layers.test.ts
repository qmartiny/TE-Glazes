import { describe, expect, it } from 'vitest';
import { layerLabel, normalizeLayers } from './layers';

describe('normalizeLayers', () => {
  it('reads combos saved before slips and oxides as glazes', () => {
    expect(normalizeLayers([{ glaze: 'Tenmoku', application: 'Dipped' }, { glaze: 'Honey', application: null }])).toEqual([
      { type: 'glaze', name: 'Tenmoku', application: 'Dipped' },
      { type: 'glaze', name: 'Honey', application: null },
    ]);
  });

  it('keeps the new format and drops anything unusable', () => {
    expect(
      normalizeLayers([
        { type: 'oxide', name: 'Cobalt Oxide', application: '' },
        { type: 'mystery', name: 'Clear' },
        { type: 'slip' },
        null,
        'Tenmoku',
      ]),
    ).toEqual([
      { type: 'oxide', name: 'Cobalt Oxide', application: null },
      { type: 'glaze', name: 'Clear', application: null },
    ]);
    expect(normalizeLayers(null)).toEqual([]);
  });
});

describe('layerLabel', () => {
  it('adds the type to slips and oxides that do not already say it', () => {
    expect(layerLabel({ type: 'slip', name: 'Blue' })).toBe('Blue slip');
    expect(layerLabel({ type: 'oxide', name: 'Cobalt Oxide' })).toBe('Cobalt Oxide');
    expect(layerLabel({ type: 'oxide', name: 'Rutile' })).toBe('Rutile oxide');
    expect(layerLabel({ type: 'glaze', name: 'Honey' })).toBe('Honey');
  });
});
