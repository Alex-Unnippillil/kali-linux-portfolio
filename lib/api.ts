export async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

export const getJson = <T>(url: string, options?: RequestInit) =>
  request<T>(url, { ...options, method: 'GET' });

export const postJson = <T>(url: string, body: unknown, options?: RequestInit) =>
  request<T>(url, { ...options, method: 'POST', body: JSON.stringify(body) });

export const putJson = <T>(url: string, body: unknown, options?: RequestInit) =>
  request<T>(url, { ...options, method: 'PUT', body: JSON.stringify(body) });

export const deleteJson = <T>(url: string, options?: RequestInit) =>
  request<T>(url, { ...options, method: 'DELETE' });
