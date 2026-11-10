// Relative /api paths go through the Vite dev proxy, so port 8000 never needs to be public.
export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`);
  if (!response.ok) throw new Error(`Request failed with ${response.status}`);
  return response.json() as Promise<T>;
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const details = await response.json().catch(() => null) as { error?: unknown; message?: unknown } | null;
    const message = typeof details?.error === 'string'
      ? details.error
      : typeof details?.message === 'string'
        ? details.message
        : `Request failed with ${response.status}`;
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}
