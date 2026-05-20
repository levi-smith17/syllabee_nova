import { Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api/client'
import { Sidebar } from '@/components/nav/sidebar'
import { SidebarProvider } from '@/components/nav/sidebar-context'

interface QuickLinksResponse {
  public: { id: string; label: string; url: string; icon: string }[]
  restricted: { id: string; label: string; url: string; icon: string }[]
}

export default function PlatformLayout() {
  const { data: quickLinks } = useQuery({
    queryKey: ['quick-links'],
    queryFn: () => apiFetch<QuickLinksResponse>('/quick-links'),
    staleTime: 1000 * 60 * 10,
  })

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          isAdmin
          quickLinks={quickLinks?.public ?? []}
          restrictedQuickLinks={quickLinks?.restricted ?? []}
        />
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  )
}
