import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api/client'
import type { User } from '@syllabee/types'

export function useCurrentUser() {
  return useQuery<User>({
    queryKey: ['current-user'],
    queryFn: () => apiFetch<User>('/profile'),
    staleTime: 1000 * 60 * 10,
    retry: 1,
  })
}
