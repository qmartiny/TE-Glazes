import { readPref, writePref } from './format';

export type Theme = 'auto' | 'light' | 'dark';

export const THEMES: { value: Theme; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

// The phone's status bar colour for each theme (the surface colour in styles.css).
const BAR_COLORS = { light: '#ffffff', dark: '#151311' };

/** Saved per device. index.html applies it too, before the first paint, so there's no flash. */
export function readTheme(): Theme {
  const saved = readPref<unknown>('theme');
  return saved === 'light' || saved === 'dark' ? saved : 'auto';
}

/** Light or dark overrides the device setting; auto follows it. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'auto') delete root.dataset.theme;
  else root.dataset.theme = theme;
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    const own = meta.media.includes('dark') ? 'dark' : 'light';
    meta.content = BAR_COLORS[theme === 'auto' ? own : theme];
  }
}

export function setTheme(theme: Theme): void {
  writePref('theme', theme);
  applyTheme(theme);
}
