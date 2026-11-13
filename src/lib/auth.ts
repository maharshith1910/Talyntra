// Talyntra Auth System — Supabase Auth (Email + Google OAuth) with Local Storage Migration Path
import { supabase, isSupabaseConfigured } from './supabase';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  passwordHash?: string;
  createdAt: string;
}

export interface AuthSession {
  userId: string;
  email: string;
  fullName: string;
  loggedInAt: string;
  provider?: 'supabase' | 'local' | 'google';
}

const USERS_KEY = 'talyntra_users';
const SESSION_KEY = 'talyntra_session';

function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const ch = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0;
  }
  return 'th_' + Math.abs(hash).toString(36) + '_' + btoa(password.slice(0, 3)).replace(/=/g, '');
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getLocalUsers(): AuthUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalUsers(users: AuthUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/**
 * Register a user via Supabase Auth (or local storage fallback).
 */
export async function register(
  email: string,
  password: string,
  fullName: string
): Promise<{ success: boolean; error?: string; session?: AuthSession }> {
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedName = fullName.trim();

  if (!trimmedEmail || !password || !trimmedName) {
    return { success: false, error: 'All fields are required.' };
  }
  if (password.length < 4) {
    return { success: false, error: 'Password must be at least 4 characters.' };
  }
  if (!trimmedEmail.includes('@')) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  // 1. Try Supabase Auth if configured
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: { full_name: trimmedName },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        const session: AuthSession = {
          userId: data.user.id,
          email: trimmedEmail,
          fullName: trimmedName,
          loggedInAt: new Date().toISOString(),
          provider: 'supabase',
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return { success: true, session };
      }
    } catch (err) {
      console.warn('Supabase sign-up failed, falling back to local migration store:', err);
    }
  }

  // 2. Migration fallback: local user store
  const users = getLocalUsers();
  if (users.find((u) => u.email === trimmedEmail)) {
    return { success: false, error: 'An account with this email already exists. Please log in.' };
  }

  const newUser: AuthUser = {
    id: generateId(),
    email: trimmedEmail,
    fullName: trimmedName,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveLocalUsers(users);

  const session: AuthSession = {
    userId: newUser.id,
    email: newUser.email,
    fullName: newUser.fullName,
    loggedInAt: new Date().toISOString(),
    provider: 'local',
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));

  return { success: true, session };
}

/**
 * Log in via Supabase Auth (or local storage fallback).
 */
export async function login(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; session?: AuthSession }> {
  const trimmedEmail = email.trim().toLowerCase();

  if (!trimmedEmail || !password) {
    return { success: false, error: 'Email and password are required.' };
  }

  // 1. Try Supabase Auth if configured
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        const session: AuthSession = {
          userId: data.user.id,
          email: trimmedEmail,
          fullName: data.user.user_metadata?.full_name || trimmedEmail.split('@')[0],
          loggedInAt: new Date().toISOString(),
          provider: 'supabase',
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return { success: true, session };
      }
    } catch (err) {
      console.warn('Supabase sign-in failed, trying local store:', err);
    }
  }

  // 2. Migration fallback: local store
  const users = getLocalUsers();
  const user = users.find((u) => u.email === trimmedEmail);

  if (!user) {
    // Check if demo credentials
    if (trimmedEmail === 'demo@talyntra.ai' && password === 'demo1234') {
      const demoSession: AuthSession = {
        userId: 'demo_user_1',
        email: 'demo@talyntra.ai',
        fullName: 'Alex Morgan',
        loggedInAt: new Date().toISOString(),
        provider: 'local',
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(demoSession));
      return { success: true, session: demoSession };
    }
    return { success: false, error: 'No account found with this email. Please sign up first.' };
  }

  if (user.passwordHash && user.passwordHash !== hashPassword(password)) {
    return { success: false, error: 'Incorrect password. Please try again.' };
  }

  const session: AuthSession = {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    loggedInAt: new Date().toISOString(),
    provider: 'local',
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));

  return { success: true, session };
}

/**
 * Log in via Google OAuth with Supabase.
 */
export async function loginWithGoogle(): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    // Demo fallback for local environment without Supabase keys
    const demoSession: AuthSession = {
      userId: `google_${Date.now()}`,
      email: 'engineer@google.com',
      fullName: 'Google User',
      loggedInAt: new Date().toISOString(),
      provider: 'google',
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(demoSession));
    return { success: true };
  }

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/upload',
      },
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Google OAuth failed' };
  }
}

export async function logout(): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
  }
  localStorage.removeItem(SESSION_KEY);
}

export function getSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return getSession() !== null;
}

export function getCurrentUserName(): string {
  const session = getSession();
  return session?.fullName || 'Guest';
}
