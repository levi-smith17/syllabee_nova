import { Navigate, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { Toaster } from 'sonner'
import ProtectedRoute from '@/components/auth/protected-route'

// Auth
import LoginPage from '@/routes/auth/login'
import ForgotPasswordPage from '@/routes/auth/forgot-password'

// Platform
import PlatformLayout from '@/routes/platform-layout'
import EditorPage from '@/routes/editor/index'
import InternshipPage from '@/routes/internship/index'
import AdminIndex from '@/routes/admin/index'
import CoursesPage from '@/routes/admin/courses'
import TermsPage from '@/routes/admin/terms'
import SectionsPage from '@/routes/admin/sections'
import UsersPage from '@/routes/admin/users'
import QuickLinksPage from '@/routes/admin/quick-links'
import SettingsPage from '@/routes/admin/settings'

// Viewer (public)
import SyllabusViewerPage from '@/routes/viewer/syllabus'

// Misc
import NotFound from '@/routes/not-found'

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="syllabee-theme">
      <Routes>
        {/* Public auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Public syllabus viewer */}
        <Route path="/s/:courseCode/:termCode/:sectionCode" element={<SyllabusViewerPage />} />

        {/* Protected platform */}
        <Route element={<ProtectedRoute />}>
          <Route element={<PlatformLayout />}>
            <Route index element={<Navigate to="/editor" replace />} />
            <Route path="/editor" element={<EditorPage />} />
            <Route path="/internship" element={<InternshipPage />} />
            <Route path="/admin" element={<AdminIndex />} />
            <Route path="/admin/courses" element={<CoursesPage />} />
            <Route path="/admin/terms" element={<TermsPage />} />
            <Route path="/admin/sections" element={<SectionsPage />} />
            <Route path="/admin/users" element={<UsersPage />} />
            <Route path="/admin/quick-links" element={<QuickLinksPage />} />
            <Route path="/admin/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </ThemeProvider>
  )
}
