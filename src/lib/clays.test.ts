import { describe, expect, it } from 'vitest';
import { clayLabel, clayNames, evenSplit, mixProblem, normalizeClays } from './clays';

describe('clays', () => {
  it('reads posts from before mixes as a single clay', () => {
    expect(normalizeClays(null, 'Porcelain')).toEqual([{ name: 'Porcelain', percent: null }]);
    expect(normalizeClays([], 'Porcelain')).toEqual([{ name: 'Porcelain', percent: null }]);
  });

  it('keeps well-formed parts and drops the rest', () => {
    expect(
      normalizeClays(
        [{ name: 'Craft Crank', percent: 50 }, { name: 'Reclaim', percent: '50' }, { name: '' }, 'x'],
        'old',
      ),
    ).toEqual([
      { name: 'Craft Crank', percent: 50 },
      { name: 'Reclaim', percent: null },
    ]);
  });

  it('labels a single clay or a mix', () => {
    expect(clayLabel([{ name: 'Porcelain', percent: null }])).toBe('Porcelain');
    const mix = [
      { name: 'Craft Crank', percent: 50 },
      { name: 'Reclaim', percent: 50 },
    ];
    expect(clayLabel(mix)).toBe('50% Craft Crank + 50% Reclaim');
    expect(clayLabel(mix.map((c) => ({ ...c, percent: null })))).toBe('Craft Crank + Reclaim');
  });

  it('lists each clay name once', () => {
    expect(
      clayNames([
        { name: 'Reclaim', percent: 30 },
        { name: 'reclaim ', percent: 70 },
      ]),
    ).toEqual(['Reclaim']);
  });

  it('accepts mixes that are unmeasured or add up to 100%', () => {
    expect(mixProblem([null, null])).toBeNull();
    expect(mixProblem([50, 50])).toBeNull();
    expect(mixProblem([60, null])).toMatch(/add up to 60%/);
    expect(mixProblem([70, 40])).toMatch(/add up to 110%/);
    expect(mixProblem([50.5, 49.5])).toMatch(/whole number/);
  });

  it('splits evenly', () => {
    expect(evenSplit(2)).toEqual([50, 50]);
    expect(evenSplit(3)).toEqual([34, 33, 33]);
    expect(evenSplit(4)).toEqual([25, 25, 25, 25]);
  });
});
