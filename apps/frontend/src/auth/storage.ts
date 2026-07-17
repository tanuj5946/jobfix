import type { AuthTokenPayload, User } from '../types';

const TOKEN_KEY = 'sf_token';
const USER_KEY = 'sf_user';

function decodePayload(token: string): AuthTokenPayload | null {
  try {
    const encodedPayload = token.split('.')[1];
    if (!encodedPayload) return null;
    const base64 = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64).split('').map(char => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''),
    );
    const payload = JSON.parse(json) as AuthTokenPayload;
    return typeof payload.userId === 'number'
      && typeof payload.email === 'string'
      && ['candidate', 'recruiter', 'admin'].includes(payload.role)
      && typeof payload.exp === 'number'
      ? payload
      : null;
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function saveAuth(accessToken: string, user: User): void {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getAccessToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const payload = token ? decodePayload(token) : null;
  if (!token || !payload || payload.exp * 1000 <= Date.now()) {
    clearAuth();
    return null;
  }
  return token;
}

export function getAccessTokenExpiresAt(): number | null {
  const token = getAccessToken();
  const payload = token ? decodePayload(token) : null;
  return payload ? payload.exp * 1000 : null;
}

export function getAuthenticatedUser(): User | null {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const user = JSON.parse(localStorage.getItem(USER_KEY) ?? '') as User;
    const payload = decodePayload(token);
    if (!payload || user.id !== payload.userId || user.email !== payload.email || user.role !== payload.role) {
      clearAuth();
      return null;
    }
    return user;
  } catch {
    clearAuth();
    return null;
  }
}
