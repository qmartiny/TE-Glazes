import { describe, expect, it } from 'vitest';
import type { ComboInput } from '../../types';
import { createLocalBackend } from './local';

const input: ComboInput = {
  clay: 'Porcelain',
  firing: 'reduction',
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
  it('starts with sample results visible to everyone, newest first', async () => {
    const backend = createLocalBackend();
    const results = await backend.listResults();
    expect(results.length).toBeGreaterThan(0);
    const dates = results.map((r) => r.createdAt);
    expect(dates).toEqual([...dates].sort().reverse());
    const full = await backend.getCombos(results.slice(0, 2).map((r) => r.id));
    expect(full).toHaveLength(2);
    expect(full.every((c) => c.author)).toBe(true);
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
    const mine = (await backend.listResults()).filter((r) => r.userId === user!.id);
    expect(mine.map((r) => r.id)).toEqual([created.id]);
    expect(mine[0].layers.map((l) => l.name)).toEqual(['White', 'Faux Celadon']);

    const updated = await backend.updateCombo(created.id, { ...input, clay: 'Special White' });
    expect(updated.clay).toBe('Special White');

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
    expect((await backend.listResults()).some((r) => r.userId === a.id)).toBe(false);
    expect(await backend.getCombos([secret.id])).toEqual([]);

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
