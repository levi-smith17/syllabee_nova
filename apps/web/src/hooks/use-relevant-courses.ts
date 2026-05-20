import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import { useCurrentUser } from '@/hooks/use-current-user'
import { apiFetch } from '@/lib/api/client'

interface Course {
  id: string
  code: string
  title: string
  isActive: boolean
}

interface Section {
  id: string
  courseId: string
  instructorId: string | null
  isActive: boolean
}

export function useRelevantCourses(): Course[] {
  const { user } = useAuth()
  const { data: profile } = useCurrentUser()

  const { data: allCourses = [] } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: () => apiFetch<{ data: Course[] }>('/registration/courses').then(r => r.data ?? []),
    staleTime: 1000 * 60 * 5,
  })

  const { data: sections = [] } = useQuery<Section[]>({
    queryKey: ['sections'],
    queryFn: () => apiFetch<{ data: Section[] }>('/registration/sections').then(r => r.data ?? []),
    staleTime: 1000 * 60 * 5,
  })

  return useMemo(() => {
    if (!user) return []

    const activeCourses = allCourses.filter(c => c.isActive)

    if (profile?.isAdmin) return activeCourses

    // Instructor: courses tied to their active assigned sections
    const myCourseIds = new Set(
      sections
        .filter(s => s.instructorId === user.id && s.isActive)
        .map(s => s.courseId)
    )
    return activeCourses.filter(c => myCourseIds.has(c.id))
  }, [user, profile, allCourses, sections])
}
