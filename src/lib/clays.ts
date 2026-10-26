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
        const { name, percent, parts } = c as Record<string, unknown>;
        if (typeof name !== 'string' || !name.trim()) return [];
        return [
          {
            name,
            percent: typeof percent === 'number' && percent > 0 ? percent : null,
            ...(typeof parts === 'number' && parts > 0 && { parts }),
          },
        ];
      })
    : [];
  if (parts.length) return parts;
  return fallback?.trim() ? [{ name: fallback, percent: null }] : [];
}

/** "1 part", "4 parts", "1.5 parts". */
export function partsLabel(parts: number): string {
  return `${parts} ${parts === 1 ? 'part' : 'parts'}`;
}

/**
 * "Craft Crank", "50% Craft Crank + 50% Reclaim", "1 part Craft Crank + 4 parts Reclaim"
 * (as it was given), or "Craft Crank + Reclaim" when not measured.
 */
export function clayLabel(clays: ClayPart[]): string {
  if (clays.length === 1) return clays[0].name;
  return clays
    .map((c) => (c.parts ? `${partsLabel(c.parts)} ${c.name}` : c.percent ? `${c.percent}% ${c.name}` : c.name))
    .join(' + ');
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

/** Parts as typed: a number above 0 (a comma works as the decimal point), NaN if it isn't one. */
export function parseParts(text: string): number {
  const t = text.trim().replace(',', '.');
  if (!/^\d*\.?\d+$/.test(t)) return NaN;
  const n = Math.round(Number(t) * 100) / 100;
  return n > 0 && n <= 1000 ? n : NaN;
}

/** Mix parts as typed (null when blank): all blank, or a number for each clay. */
export function partsProblem(parts: (number | null)[]): string | null {
  if (parts.length < 2 || parts.every((p) => p === null)) return null;
  if (parts.some((p) => p !== null && Number.isNaN(p))) {
    return 'Parts should be a number above 0, like 1 or 2.5.';
  }
  return parts.some((p) => p === null) ? 'Give each clay a number of parts, or leave them all blank.' : null;
}

/** Parts as whole percentages adding up to 100, e.g. 1 : 4 → 20, 80 and 1 : 2 → 33, 67. */
export function partsToPercents(parts: number[]): number[] {
  const total = parts.reduce((sum, p) => sum + p, 0);
  const exact = parts.map((p) => (p / total) * 100);
  const result = exact.map((x) => Math.max(1, Math.floor(x)));
  let left = 100 - result.reduce((sum, p) => sum + p, 0);
  // The rest goes to the biggest remainders; if every clay needed at least 1%, take back from the biggest share.
  const byRemainder = exact.map((_, i) => i).sort((a, b) => (exact[b] % 1) - (exact[a] % 1));
  for (let k = 0; left > 0; k = (k + 1) % byRemainder.length, left--) result[byRemainder[k]]++;
  for (; left < 0; left++) result[result.indexOf(Math.max(...result))]--;
  return result;
}

/** Percentages as the simplest whole parts, e.g. 20, 80 → 1, 4; an even split → 1 each. */
export function percentsToParts(percents: number[]): number[] {
  if (percents.join() === evenSplit(percents.length).join()) return percents.map(() => 1);
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const d = percents.reduce(gcd);
  return percents.map((p) => p / d);
}

/** An even split, e.g. 50/50 or 34/33/33. */
export function evenSplit(count: number): number[] {
  const base = Math.floor(100 / count);
  return Array.from({ length: count }, (_, i) => base + (i < 100 - base * count ? 1 : 0));
}
