export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** Small convenience memory (last clay/firing used), safe when storage is blocked. */
export function readPref<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`te-glazes:${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writePref(key: string, value: unknown): void {
  try {
    localStorage.setItem(`te-glazes:${key}`, JSON.stringify(value));
  } catch {
    // Not important enough to surface.
  }
}
