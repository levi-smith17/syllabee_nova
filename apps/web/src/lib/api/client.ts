import { getAuthHeaders } from '@/lib/api/auth-headers'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const authHeaders = await getAuthHeaders()
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options?.headers,
    },
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}
