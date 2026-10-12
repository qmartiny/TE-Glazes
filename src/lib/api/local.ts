import type { AuthUser, Combo, FacetRow, Profile } from '../../types';
import { matchesFilters } from '../filters';
import { normalizeLayers } from '../layers';
import type { Backend } from './backend';
import { DEMO_PROFILES, demoCombos } from './demoSeed';

// Demo mode: a stand-in backend that keeps everything in this browser
// (IndexedDB), so the site can be tried before Supabase is set up.

interface Account {
  id: string;
  email: string;
  password: string;
}

type StoredCombo = Omit<Combo, 'author'>;

interface State {
  accounts: Account[];
  profiles: Profile[];
  combos: StoredCombo[];
  sessionUserId: string | null;
}

const DB_NAME = 'te-glazes-demo';
const STORE = 'kv';
const KEY = 'state';

function seedState(): State {
  return { accounts: [], profiles: [...DEMO_PROFILES], combos: demoCombos(), sessionUserId: null };
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Persistence that quietly degrades to memory-only if IndexedDB is blocked. */
function createStore() {
  let db: Promise<IDBDatabase | null> | null = null;
  const getDb = () => (db ??= openDb().catch(() => null));

  return {
    async load(): Promise<State | null> {
      const conn = await getDb();
      if (!conn) return null;
      return new Promise((resolve) => {
        const req = conn.transaction(STORE).objectStore(STORE).get(KEY);
        req.onsuccess = () => resolve((req.result as State | undefined) ?? null);
        req.onerror = () => resolve(null);
      });
    },
    async save(state: State): Promise<void> {
      const conn = await getDb();
      if (!conn) return;
      await new Promise<void>((resolve) => {
        const tx = conn.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(state, KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    },
  };
}

function newId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function createLocalBackend(): Backend {
  const store = typeof indexedDB === 'undefined' ? null : createStore();
  const listeners = new Set<(user: AuthUser | null) => void>();
  let state: Promise<State> | null = null;

  const getState = () =>
    (state ??= (async () => {
      const saved = await store?.load();
      if (!saved) return seedState();
      // Demo data saved by an older version stored glaze-only layers.
      for (const c of saved.combos) c.layers = normalizeLayers(c.layers);
      return saved;
    })());

  async function update<T>(fn: (s: State) => T): Promise<T> {
    const s = await getState();
    const result = fn(s);
    await store?.save(s);
    return structuredClone(result);
  }

  async function currentUser(): Promise<AuthUser | null> {
    const s = await getState();
    const account = s.accounts.find((a) => a.id === s.sessionUserId);
    return account ? { id: account.id, email: account.email } : null;
  }

  function notify(user: AuthUser | null) {
    for (const cb of listeners) cb(user);
  }

  function withAuthor(s: State, c: StoredCombo): Combo {
    const p = s.profiles.find((x) => x.id === c.userId);
    return structuredClone({
      ...c,
      author: p ? { id: p.id, displayName: p.displayName, studio: p.studio } : null,
    });
  }

  function visible(s: State) {
    return s.combos.filter((c) => !c.isPrivate || c.userId === s.sessionUserId);
  }

  function requireUser(s: State, userId?: string) {
    if (!s.sessionUserId) throw new Error('Please sign in first.');
    if (userId && userId !== s.sessionUserId) throw new Error("You can only change your own things.");
  }

  return {
    mode: 'demo',

    getUser: currentUser,

    onAuthChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },

    async signIn(email, password) {
      const user = await update((s) => {
        const account = s.accounts.find((a) => a.email === email.trim().toLowerCase());
        if (!account || account.password !== password) throw new Error('Invalid login credentials');
        s.sessionUserId = account.id;
        return { id: account.id, email: account.email };
      });
      notify(user);
    },

    async signUp({ email, password, displayName, studio }) {
      const user = await update((s) => {
        const normalized = email.trim().toLowerCase();
        if (s.accounts.some((a) => a.email === normalized)) throw new Error('User already registered');
        const id = newId();
        s.accounts.push({ id, email: normalized, password });
        s.profiles.push({ id, displayName, studio, bio: null, createdAt: new Date().toISOString() });
        s.sessionUserId = id;
        return { id, email: normalized };
      });
      notify(user);
      return false;
    },

    async signOut() {
      await update((s) => {
        s.sessionUserId = null;
      });
      notify(null);
    },

    async requestPasswordReset() {
      throw new Error('Password reset emails are not available in demo mode.');
    },

    async updatePassword(password) {
      await update((s) => {
        requireUser(s);
        const account = s.accounts.find((a) => a.id === s.sessionUserId);
        if (account) account.password = password;
      });
    },

    async getProfile(id) {
      const s = await getState();
      return structuredClone(s.profiles.find((p) => p.id === id) ?? null);
    },

    async listProfiles() {
      const s = await getState();
      return structuredClone([...s.profiles].sort((a, b) => a.displayName.localeCompare(b.displayName)));
    },

    saveProfile(id, input) {
      return update((s) => {
        requireUser(s, id);
        let profile = s.profiles.find((p) => p.id === id);
        if (!profile) {
          profile = { id, createdAt: new Date().toISOString(), ...input };
          s.profiles.push(profile);
        } else {
          Object.assign(profile, input);
        }
        return profile;
      });
    },

    async listCombos(filters, offset, limit) {
      const s = await getState();
      const rows = visible(s)
        .filter((c) => matchesFilters(c, filters))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return {
        items: rows.slice(offset, offset + limit).map((c) => withAuthor(s, c)),
        hasMore: rows.length > offset + limit,
      };
    },

    async getCombo(id) {
      const s = await getState();
      const c = visible(s).find((x) => x.id === id);
      return c ? withAuthor(s, c) : null;
    },

    async listFacetRows() {
      const s = await getState();
      return visible(s).map(
        (c): FacetRow => ({ userId: c.userId, clay: c.clay, firing: c.firing, layers: c.layers }),
      );
    },

    async createCombo(userId, input) {
      const stored = await update((s) => {
        requireUser(s, userId);
        const now = new Date().toISOString();
        const c: StoredCombo = { ...input, id: newId(), userId, createdAt: now, updatedAt: now };
        s.combos.push(c);
        return c;
      });
      return withAuthor(await getState(), stored);
    },

    async updateCombo(id, input) {
      const stored = await update((s) => {
        const c = s.combos.find((x) => x.id === id);
        if (!c) throw new Error('Combo not found');
        requireUser(s, c.userId);
        Object.assign(c, input, { updatedAt: new Date().toISOString() });
        return c;
      });
      return withAuthor(await getState(), stored);
    },

    async deleteCombo(combo) {
      await update((s) => {
        const c = s.combos.find((x) => x.id === combo.id);
        if (!c) return;
        requireUser(s, c.userId);
        s.combos = s.combos.filter((x) => x.id !== combo.id);
      });
    },

    async uploadPhoto(_userId, photo) {
      const [path, thumb] = await Promise.all([blobToDataUrl(photo.full), blobToDataUrl(photo.thumb)]);
      return { path, thumb, width: photo.width, height: photo.height };
    },

    async deletePhotos() {
      // Photos live inside the combo record in demo mode; nothing to clean up.
    },

    photoUrl(path) {
      return path;
    },
  };
}
