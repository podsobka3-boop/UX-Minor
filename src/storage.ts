// Всё хранится в localStorage этого браузера.
export type Answer = 'doing' | 'distracted' | 'done';

export interface User {
  id: string;
  name: string;
  passwordHash: string;
  createdAt: number;
}

export interface Settings {
  minIntervalMin: number;
  maxIntervalMin: number;
  sound: boolean;
  demo: boolean; // демо-режим: тыкалка через 5–15 секунд
}

export interface Goal {
  id: string;
  text: string;
  createdAt: number;
  doneAt?: number;
}

export interface NudgeEvent {
  at: number;
  goalId: string;
  message: string;
  kind: 'progress' | 'done';
  answer?: Answer;
}

export interface Session {
  id: string;
  userId: string;
  startedAt: number;
  nextNudgeAt: number | null;
  endedAt?: number;
  status: 'active' | 'finished';
  goals: Goal[];
  events: NudgeEvent[];
}

export const GUEST = 'guest';

export const DEFAULT_SETTINGS: Settings = { minIntervalMin: 5, maxIntervalMin: 20, sound: false, demo: false };

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* хранилище недоступно — работаем без сохранения */
  }
}

export const loadUsers = () => read<User[]>('zz.users', []);
export const saveUsers = (users: User[]) => write('zz.users', users);

export const loadCurrentUserId = () => read<string>('zz.currentUserId', GUEST);
export const saveCurrentUserId = (id: string) => write('zz.currentUserId', id);

export const loadSettings = (userId: string) => ({ ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(`zz.settings.${userId}`, {}) });
export const saveSettings = (userId: string, s: Settings) => write(`zz.settings.${userId}`, s);

export const loadSessions = (userId: string) => read<Session[]>(`zz.sessions.${userId}`, []);
export const saveSessions = (userId: string, s: Session[]) => write(`zz.sessions.${userId}`, s);

export function uid() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function hashPassword(password: string) {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
