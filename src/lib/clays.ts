import type { ClayPart } from '../types';
import { normName } from './layers';

export const MAX_CLAYS = 4;

/**
 * Clays as stored. Posts from before mixes only have a single clay name, and
 * anything malformed is dropped.
 */
export function normalizeClays(raw: unknown, fallback?: string | null): ClayPart[] {
  const parts = Array.isArray(raw)
    ? raw.flatMap((c): ClayPart[] => {
        if (!c || typeof c !== 'object') return [];
        const { name, percent } = c as Record<string, unknown>;
        if (typeof name !== 'string' || !name.trim()) return [];
        return [{ name, percent: typeof percent === 'number' && percent > 0 ? percent : null }];
      })
    : [];
  if (parts.length) return parts;
  return fallback?.trim() ? [{ name: fallback, percent: null }] : [];
}

/** "Craft Crank", "50% Craft Crank + 50% Reclaim", or "Craft Crank + Reclaim" when not measured. */
export function clayLabel(clays: ClayPart[]): string {
  if (clays.length === 1) return clays[0].name;
  return clays.map((c) => (c.percent ? `${c.percent}% ${c.name}` : c.name)).join(' + ');
}

/** Each clay name once, in order. */
export function clayNames(clays: ClayPart[]): string[] {
  const seen = new Set<string>();
  return clays.flatMap((c) => {
    const key = normName(c.name);
    if (seen.has(key)) return [];
    seen.add(key);
    return [c.name];
  });
}

/** Mix shares as typed: all blank, or adding up to 100. */
export function mixProblem(percents: (number | null)[]): string | null {
  if (percents.length < 2 || percents.every((p) => p === null)) return null;
  if (percents.some((p) => p !== null && (!Number.isInteger(p) || p < 1 || p > 100))) {
    return 'Each clay percentage should be a whole number from 1 to 100.';
  }
  const total = percents.reduce<number>((sum, p) => sum + (p ?? 0), 0);
  return total === 100
    ? null
    : `The clay percentages add up to ${total}%. Make them total 100%, or leave them all blank.`;
}

/** An even split, e.g. 50/50 or 34/33/33. */
export function evenSplit(count: number): number[] {
  const base = Math.floor(100 / count);
  return Array.from({ length: count }, (_, i) => base + (i < 100 - base * count ? 1 : 0));
}
