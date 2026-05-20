import { Outlet, useMatch, useNavigate } from 'react-router-dom'
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

  const isRegistration = !!useMatch('/registration/*')
  const navigate = useNavigate()

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          isAdmin
          quickLinks={quickLinks?.public ?? []}
          restrictedQuickLinks={quickLinks?.restricted ?? []}
        />
        <main className="flex-1 overflow-hidden relative">
          {isRegistration ? (
            <>
              <div
                className="absolute inset-0 bg-black/40 z-10"
                onClick={() => navigate(-1)}
              />
              <div className="absolute top-0 left-0 h-full w-full md:w-96 bg-muted z-20 shadow-xl border-r overflow-hidden">
                <Outlet />
              </div>
            </>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </SidebarProvider>
  )
}
