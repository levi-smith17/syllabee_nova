import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api/client'
import type { User } from '@syllabee/types'

export function useCurrentUser(options?: { enabled?: boolean }) {
  return useQuery<User>({
    queryKey: ['current-user'],
    queryFn: () => apiFetch<{ data: User }>('/profile').then(r => r.data),
    staleTime: 1000 * 60 * 10,
    retry: 1,
    enabled: options?.enabled ?? true,
  })
}
