import { handleStaticRequest } from './staticEngine';

const TOKEN_KEY = 'igleico_sabana_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function isStaticMode(): boolean {
  if (import.meta.env.VITE_STATIC_DEMO === 'true') return true;
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('.github.io')) {
    return true;
  }
  return false;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();

  if (isStaticMode()) {
    const parsedBody =
      typeof options.body === 'string'
        ? (JSON.parse(options.body) as Record<string, unknown>)
        : undefined;
    try {
      return await handleStaticRequest<T>(path, options.method || 'GET', parsedBody, token);
    } catch (err) {
      if (err instanceof Error && err.message.includes('Sesión requerida') && path !== '/api/auth/login') {
        setStoredToken(null);
        window.dispatchEvent(new Event('igleico:unauthorized'));
      }
      throw err;
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && path !== '/api/auth/login') {
      setStoredToken(null);
      window.dispatchEvent(new Event('igleico:unauthorized'));
    }
    throw new Error((data as { error?: string }).error || `Error ${res.status}`);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
