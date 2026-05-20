import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "sonner";

// Viewer has its own lightweight layout — no sidebar, publicly accessible
export default function ViewerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
      <Toaster richColors position="bottom-right" />
    </ThemeProvider>
  );
}
