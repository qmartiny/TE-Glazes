import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readTheme } from './theme';

function stubStorage(getItem: () => string | null) {
  vi.stubGlobal('localStorage', { getItem, setItem: () => {} });
}

describe('theme', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads a saved choice', () => {
    stubStorage(() => '"dark"');
    expect(readTheme()).toBe('dark');
    stubStorage(() => '"auto"');
    expect(readTheme()).toBe('auto');
    stubStorage(() => '"light"');
    expect(readTheme()).toBe('light');
  });

  it('is light when nothing valid is saved or storage is blocked', () => {
    stubStorage(() => null);
    expect(readTheme()).toBe('light');
    stubStorage(() => '"purple"');
    expect(readTheme()).toBe('light');
    stubStorage(() => {
      throw new Error('blocked');
    });
    expect(readTheme()).toBe('light');
  });

  it('is applied by index.html before the first paint, from the same storage key', () => {
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    expect(html).toContain("localStorage.getItem('te-glazes:theme')");
  });
});
