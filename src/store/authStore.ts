import { create } from 'zustand';
import type { LoginResultDto } from '../types';

export const AUTH_STORAGE_KEY = 'vsoko.auth.v1';
const legacyKeys = ['accessToken', 'refreshToken', 'userId', 'isAdmin', 'mustChangePassword'] as const;
interface StoredSession {
  id: string;
  data: LoginResultDto;
}
interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  isAdmin: boolean;
  mustChangePassword: boolean;
  isAuthenticated: boolean;
  sessionId: string | null;
  sessionVersion: number;
  login: (data: LoginResultDto) => void;
  updateSession: (data: LoginResultDto) => void;
  logout: () => void;
  requirePasswordChange: () => void;
  syncFromStorage: () => void;
}

function readSession(): StoredSession | null {
  try {
    const session = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || 'null');
    if (typeof session?.id === 'string' && typeof session.data?.accessToken === 'string' &&
        typeof session.data?.refreshToken === 'string' && typeof session.data?.userId === 'string' &&
        typeof session.data?.isAdmin === 'boolean' && typeof session.data?.mustChangePassword === 'boolean') {
      return session;
    }
  } catch { /* Invalid storage is treated as a signed-out session. */ }
  return null;
}

// Migrate once. Afterwards a session is written atomically, never as separate keys.
if (!localStorage.getItem(AUTH_STORAGE_KEY) && localStorage.getItem('accessToken')) {
  const refresh = localStorage.getItem('refreshToken') || '';
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
    id: `legacy:${refresh}`,
    data: {
      accessToken: localStorage.getItem('accessToken'), refreshToken: refresh,
      userId: localStorage.getItem('userId'), expires: '',
      isAdmin: localStorage.getItem('isAdmin') === 'true',
      mustChangePassword: localStorage.getItem('mustChangePassword') === 'true',
    },
  }));
}
for (const key of legacyKeys) localStorage.removeItem(key);

function stateFrom(session: StoredSession | null) {
  return {
    accessToken: session?.data.accessToken ?? null,
    refreshToken: session?.data.refreshToken ?? null,
    userId: session?.data.userId ?? null,
    isAdmin: session?.data.isAdmin ?? false,
    mustChangePassword: session?.data.mustChangePassword ?? false,
    isAuthenticated: !!session,
    sessionId: session?.id ?? null,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ...stateFrom(readSession()),
  sessionVersion: 0,
  syncFromStorage: () => {
    const session = stateFrom(readSession());
    const previous = get();
    const changed = session.sessionId !== previous.sessionId || session.userId !== previous.userId ||
      session.isAdmin !== previous.isAdmin;
    set({ ...session, sessionVersion: previous.sessionVersion + Number(changed) });
  },
  login: (data) => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ id: crypto.randomUUID(), data }));
    get().syncFromStorage();
  },
  updateSession: (data) => {
    const current = readSession();
    if (!current || current.id !== get().sessionId || current.data.userId !== data.userId) return;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ id: current.id, data }));
    get().syncFromStorage();
  },
  logout: () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    get().syncFromStorage();
  },
  requirePasswordChange: () => {
    const current = readSession();
    if (!current || current.id !== get().sessionId) return;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
      ...current, data: { ...current.data, mustChangePassword: true },
    }));
    get().syncFromStorage();
  },
}));

window.addEventListener('storage', (event) => {
  if (event.storageArea === localStorage && (event.key === AUTH_STORAGE_KEY || event.key === null)) {
    useAuthStore.getState().syncFromStorage();
  }
});

export function getHomePath(session: Pick<AuthState, 'isAuthenticated' | 'isAdmin' | 'mustChangePassword'>) {
  if (!session.isAuthenticated) return '/login';
  if (session.mustChangePassword) return '/change-password';
  return session.isAdmin ? '/dashboard' : '/workloads';
}
