import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ICONS } from './Icon';

describe('Material Symbols subset', () => {
  it('index.html downloads exactly the icons the app uses (sorted, as Google Fonts requires)', () => {
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    const requested = html.match(/icon_names=([a-z_,]+)/)?.[1].split(',');
    expect(requested).toEqual([...ICONS].sort());
  });
});
