import { describe, expect, it } from 'vitest';
import {
  comboKey,
  isStudioMaterial,
  layerLabel,
  memberNames,
  normalizeLayers,
  usesStudioMaterialsOnly,
} from './layers';

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

describe('comboKey', () => {
  it('depends on the layers and their order, not on how they were applied or spelt', () => {
    const a = comboKey([
      { type: 'glaze', name: 'Tenmoku' },
      { type: 'glaze', name: 'Midnight Blue' },
    ]);
    expect(comboKey([{ type: 'glaze', name: ' tenmoku' }, { type: 'glaze', name: 'MIDNIGHT  blue' }])).toBe(a);
    expect(comboKey([{ type: 'glaze', name: 'Midnight Blue' }, { type: 'glaze', name: 'Tenmoku' }])).not.toBe(a);
    expect(comboKey([{ type: 'slip', name: 'Tenmoku' }, { type: 'glaze', name: 'Midnight Blue' }])).not.toBe(a);
  });
});

describe('normalizeLayers spelling', () => {
  it("uses the studio's spelling for listed names and keeps other names as typed", () => {
    expect(normalizeLayers([{ type: 'glaze', name: '  tenmoku ' }, { type: 'glaze', name: ' My  Own ' }])).toEqual([
      { type: 'glaze', name: 'Tenmoku', application: null },
      { type: 'glaze', name: 'My  Own', application: null },
    ]);
  });
});

describe('studio materials', () => {
  it("knows the studio's own glazes, slips and oxides, ignoring capitals and spaces", () => {
    expect(isStudioMaterial({ type: 'glaze', name: 'tenmoku ' })).toBe(true);
    expect(isStudioMaterial({ type: 'glaze', name: 'Amaco Velvet Red' })).toBe(false);
    expect(isStudioMaterial({ type: 'slip', name: 'Blue' })).toBe(true);
    expect(isStudioMaterial({ type: 'glaze', name: 'Blue' })).toBe(false); // a slip, not a glaze
  });

  it('marks a combo with any custom layer as not studio-only', () => {
    expect(
      usesStudioMaterialsOnly([
        { type: 'slip', name: 'Blue' },
        { type: 'glaze', name: 'Tenmoku' },
      ]),
    ).toBe(true);
    expect(
      usesStudioMaterialsOnly([
        { type: 'glaze', name: 'Tenmoku' },
        { type: 'glaze', name: 'Mayco Red' },
      ]),
    ).toBe(false);
  });
});

describe('memberNames', () => {
  const post = (layers: [string, string][], clays: string[] = ['Craft Crank']) => ({
    layers: layers.map(([type, name]) => ({ type: type as 'glaze' | 'slip' | 'oxide', name })),
    clays: clays.map((name) => ({ name })),
  });

  it("lists the custom names members have used (not the studio's), once each, A to Z", () => {
    const names = memberNames(
      [
        post([
          ['glaze', 'Tenmoku'],
          ['glaze', 'Mayco Stroke & Coat Red'],
        ]),
        post(
          [
            ['glaze', 'Amaco Velvet Jet Black'],
            ['slip', 'Porcelain slip'],
          ],
          ['Paper clay', 'Reclaim'],
        ),
        post([['glaze', 'amaco velvet  jet black']]),
      ],
      ['Craft Crank', 'Reclaim'],
    );
    expect(names).toEqual({
      glaze: ['Amaco Velvet Jet Black', 'Mayco Stroke & Coat Red'],
      slip: ['Porcelain slip'],
      oxide: [],
      clay: ['Paper clay'],
    });
  });

  it('uses the spelling most people used', () => {
    const names = memberNames(
      [post([['glaze', 'amaco red']]), post([['glaze', 'Amaco Red']]), post([['glaze', 'Amaco Red']])],
      [],
    );
    expect(names.glaze).toEqual(['Amaco Red']);
  });
});
