import { Outlet, Route, Routes, useLocation, useMatch, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api/client'
import { Sidebar } from '@/components/nav/sidebar'
import { SidebarProvider } from '@/components/nav/sidebar-context'
import EditorPage from '@/routes/editor/index'
import InternshipPage from '@/routes/internship/index'
import AdminIndex from '@/routes/admin/index'
import UsersPage from '@/routes/admin/users'
import QuickLinksPage from '@/routes/admin/quick-links'
import SettingsPage from '@/routes/admin/settings'

interface QuickLink { id: string; label: string; url: string; icon: string; restricted: boolean }
interface QuickLinksResponse {
  public: QuickLink[]
  restricted: QuickLink[]
}

export default function PlatformLayout() {
  const { data: quickLinks } = useQuery({
    queryKey: ['quick-links'],
    queryFn: () => apiFetch<{ data: QuickLink[] }>('/admin/quick-links').then(r => {
      const links = r.data ?? []
      return {
        public: links.filter(l => !l.restricted),
        restricted: links.filter(l => l.restricted),
      } satisfies QuickLinksResponse
    }),
    staleTime: 1000 * 60 * 10,
  })

  const location = useLocation()
  const isRegistration = !!useMatch('/registration/*')
  const isQuickLinks = !!useMatch('/admin/quick-links')
  const isUsers = !!useMatch('/admin/users')
  const isPanel = isRegistration || isQuickLinks || isUsers
  const navigate = useNavigate()

  const backgroundLocation = (location.state as any)?.backgroundLocation
  const backgroundPath: string = backgroundLocation?.pathname ?? '/editor'
  const closePanel = () => navigate(backgroundPath, { replace: true })

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          isAdmin
          quickLinks={quickLinks?.public ?? []}
          restrictedQuickLinks={quickLinks?.restricted ?? []}
        />
        <main className="flex-1 overflow-hidden relative">
          {isPanel ? (
            <>
              {/* Background page — rendered at the location that was active before opening the panel */}
              <div className="absolute inset-0 z-0">
                <Routes location={backgroundLocation ?? location}>
                  <Route path="/editor" element={<EditorPage />} />
                  <Route path="/internship" element={<InternshipPage />} />
                  <Route path="/admin" element={<AdminIndex />} />
                  <Route path="/admin/users" element={<UsersPage />} />
                  <Route path="/admin/quick-links" element={<QuickLinksPage />} />
                  <Route path="/admin/settings" element={<SettingsPage />} />
                </Routes>
              </div>
              {/* Overlay */}
              <div
                className="absolute inset-0 bg-black/60 z-10"
                onClick={closePanel}
              />
              {/* Panel */}
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
