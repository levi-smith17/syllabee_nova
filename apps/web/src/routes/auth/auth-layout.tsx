export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="rounded-xl bg-muted/50 p-8 flex flex-col max-w-sm w-full gap-6">
          <div className="flex items-center gap-2 justify-center">
            <img
              src="/logo.png"
              alt=""
              className="h-8 w-8 object-contain"
              onError={(e) => e.currentTarget.remove()}
            />
            <span className="text-xl font-bold tracking-tight text-primary">Syllabee</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
