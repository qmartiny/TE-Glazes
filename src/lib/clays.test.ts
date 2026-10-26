import { describe, expect, it } from 'vitest';
import {
  clayLabel,
  clayNames,
  evenSplit,
  mixProblem,
  normalizeClays,
  parseParts,
  partsProblem,
  partsToPercents,
  percentsToParts,
} from './clays';

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

  it('keeps and labels a mix given in parts', () => {
    const parts = [
      { name: 'Craft Crank', percent: 20, parts: 1 },
      { name: 'Reclaim', percent: 80, parts: 4 },
    ];
    expect(normalizeClays(parts)).toEqual(parts);
    expect(normalizeClays([{ name: 'Reclaim', percent: 50, parts: -1 }])).toEqual([{ name: 'Reclaim', percent: 50 }]);
    expect(clayLabel(parts)).toBe('1 part Craft Crank + 4 parts Reclaim');
    expect(clayLabel([{ ...parts[0], parts: 1.5 }, parts[1]])).toBe('1.5 parts Craft Crank + 4 parts Reclaim');
  });

  it('reads parts as typed', () => {
    expect(parseParts('4')).toBe(4);
    expect(parseParts(' 2.5 ')).toBe(2.5);
    expect(parseParts('1,5')).toBe(1.5);
    expect(parseParts('0')).toBeNaN();
    expect(parseParts('1/4')).toBeNaN();
    expect(parseParts('abc')).toBeNaN();
    expect(partsProblem([null, null])).toBeNull();
    expect(partsProblem([1, 4])).toBeNull();
    expect(partsProblem([1, null])).toMatch(/each clay a number of parts/);
    expect(partsProblem([1, NaN])).toMatch(/number above 0/);
  });

  it('turns parts into whole percentages adding up to 100, and back', () => {
    expect(partsToPercents([1, 4])).toEqual([20, 80]);
    expect(partsToPercents([1, 2])).toEqual([33, 67]);
    expect(partsToPercents([1, 1, 1])).toEqual([34, 33, 33]);
    expect(partsToPercents([2.5, 1])).toEqual([71, 29]);
    expect(partsToPercents([1, 300])).toEqual([1, 99]); // every clay gets at least 1%
    expect(percentsToParts([20, 80])).toEqual([1, 4]);
    expect(percentsToParts([50, 50])).toEqual([1, 1]);
    expect(percentsToParts([34, 33, 33])).toEqual([1, 1, 1]);
    expect(percentsToParts([30, 70])).toEqual([3, 7]);
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
