// Talyntra Auth System — LocalStorage-based authentication
// Supports multiple user accounts with session persistence

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  passwordHash: string;
  createdAt: string;
}

export interface AuthSession {
  userId: string;
  email: string;
  fullName: string;
  loggedInAt: string;
}

const USERS_KEY = 'talyntra_users';
const SESSION_KEY = 'talyntra_session';

function hashPassword(password: string): string {
  // Simple hash for client-side demo auth (NOT production-grade)
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

function getUsers(): AuthUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveUsers(users: AuthUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function register(email: string, password: string, fullName: string): { success: boolean; error?: string; session?: AuthSession } {
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

  const users = getUsers();
  if (users.find(u => u.email === trimmedEmail)) {
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
  saveUsers(users);

  const session: AuthSession = {
    userId: newUser.id,
    email: newUser.email,
    fullName: newUser.fullName,
    loggedInAt: new Date().toISOString(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));

  return { success: true, session };
}

export function login(email: string, password: string): { success: boolean; error?: string; session?: AuthSession } {
  const trimmedEmail = email.trim().toLowerCase();

  if (!trimmedEmail || !password) {
    return { success: false, error: 'Email and password are required.' };
  }

  const users = getUsers();
  const user = users.find(u => u.email === trimmedEmail);

  if (!user) {
    return { success: false, error: 'No account found with this email. Please sign up first.' };
  }

  if (user.passwordHash !== hashPassword(password)) {
    return { success: false, error: 'Incorrect password. Please try again.' };
  }

  const session: AuthSession = {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    loggedInAt: new Date().toISOString(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));

  return { success: true, session };
}

export function logout(): void {
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

