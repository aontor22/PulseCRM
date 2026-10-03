const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

let accessToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include'
    })
      .then(async (res) => {
        if (!res.ok) return false;
        const data = await res.json();
        setAccessToken(data.accessToken);
        window.dispatchEvent(new CustomEvent('crm:refreshed', { detail: data.user }));
        return true;
      })
      .catch(() => false)
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

type ApiOptions = RequestInit & { orgId?: string; retry?: boolean };

export async function api<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
  const { orgId, retry = true, ...init } = options;
  const headers = new Headers(init.headers || {});
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  if (orgId) headers.set('x-organization-id', orgId);

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include'
  });

  if (response.status === 401 && retry && path !== '/auth/refresh') {
    const refreshed = await refreshAccessToken();
    if (refreshed) return api<T>(path, { ...options, retry: false });
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(payload.message || 'Request failed');
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export { API_URL, refreshAccessToken };
