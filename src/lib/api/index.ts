import type { Backend } from './backend';
import { createLocalBackend } from './local';
import { createSupabaseBackend } from './supabase';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Supabase when configured, otherwise demo mode (data stays in this browser). */
export const backend: Backend = url && anonKey ? createSupabaseBackend(url, anonKey) : createLocalBackend();

export type { Backend, Page } from './backend';
