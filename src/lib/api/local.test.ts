import { describe, expect, it } from 'vitest';
import type { ComboInput } from '../../types';
import { createLocalBackend } from './local';

const input: ComboInput = {
  title: null,
  clay: 'Porcelain',
  firing: 'reduction',
  studio: 'Hoxton',
  layers: [
    { type: 'slip', name: 'White', application: 'Brushed' },
    { type: 'glaze', name: 'Faux Celadon', application: 'Dipped' },
  ],
  description: 'Two dips',
  photos: [{ path: 'p', thumb: 't', width: 1, height: 1 }],
  isPrivate: false,
};

// No IndexedDB under Node, so this exercises the in-memory fallback.
describe('demo backend', () => {
  it('starts with sample combos visible to everyone', async () => {
    const backend = createLocalBackend();
    const page = await backend.listCombos({}, 0, 100);
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.every((c) => c.author)).toBe(true);
  });

  it('signs up, creates, filters, edits and deletes a combo', async () => {
    const backend = createLocalBackend();
    await expect(backend.createCombo('x', input)).rejects.toThrow(/sign in/i);

    const seen: (string | null)[] = [];
    backend.onAuthChange((u) => seen.push(u?.email ?? null));
    await backend.signUp({ email: 'Me@Example.com', password: 'secret1', displayName: 'Me', studio: 'Hoxton' });
    const user = await backend.getUser();
    expect(user?.email).toBe('me@example.com');
    expect(seen).toEqual(['me@example.com']);
    expect((await backend.getProfile(user!.id))?.displayName).toBe('Me');

    const created = await backend.createCombo(user!.id, input);
    expect(created.author?.displayName).toBe('Me');
    const mine = await backend.listCombos({ user: user!.id }, 0, 10);
    expect(mine.items.map((c) => c.id)).toEqual([created.id]);
    const filtered = await backend.listCombos({ glaze: 'Faux Celadon', slip: 'White', clay: 'Porcelain' }, 0, 10);
    expect(filtered.items.map((c) => c.id)).toEqual([created.id]);

    const updated = await backend.updateCombo(created.id, { ...input, title: 'Pooling celadon' });
    expect(updated.title).toBe('Pooling celadon');

    await backend.deleteCombo(updated);
    expect(await backend.getCombo(created.id)).toBeNull();
  });

  it('hides private combos from everyone else', async () => {
    const backend = createLocalBackend();
    await backend.signUp({ email: 'a@x.com', password: 'secret1', displayName: 'A', studio: null });
    const a = (await backend.getUser())!;
    const secret = await backend.createCombo(a.id, { ...input, isPrivate: true });
    expect(await backend.getCombo(secret.id)).not.toBeNull();

    await backend.signOut();
    expect(await backend.getCombo(secret.id)).toBeNull();
    expect((await backend.listFacetRows()).some((r) => r.userId === a.id)).toBe(false);

    await backend.signUp({ email: 'b@x.com', password: 'secret1', displayName: 'B', studio: null });
    expect(await backend.getCombo(secret.id)).toBeNull();
    await expect(backend.deleteCombo(secret)).rejects.toThrow(/your own/);
    await backend.signOut();
    await backend.signIn('a@x.com', 'secret1');
    expect(await backend.getCombo(secret.id)).not.toBeNull();
  });

  it('rejects a wrong password', async () => {
    const backend = createLocalBackend();
    await backend.signUp({ email: 'a@x.com', password: 'secret1', displayName: 'A', studio: null });
    await backend.signOut();
    await expect(backend.signIn('a@x.com', 'nope')).rejects.toThrow(/invalid/i);
  });
});
