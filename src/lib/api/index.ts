import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../../config';
import type { Backend } from './backend';
import { createLocalBackend } from './local';
import { createSupabaseBackend } from './supabase';

// Environment variables (e.g. .env.local) override the values in config.ts.
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || SUPABASE_URL;
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || SUPABASE_ANON_KEY;

// VITE_DEMO=true forces demo mode, e.g. to try changes without touching real data.
const demo = import.meta.env.VITE_DEMO === 'true';

/** Supabase when configured, otherwise demo mode (data stays in this browser). */
export const backend: Backend =
  !demo && url && anonKey ? createSupabaseBackend(url, anonKey) : createLocalBackend();

export type { Backend, Page } from './backend';
