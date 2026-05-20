import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center p-8">
      <p className="text-4xl font-bold text-muted-foreground">404</p>
      <p className="text-lg font-medium">Page not found</p>
      <Button asChild variant="outline">
        <Link to="/editor">Go home</Link>
      </Button>
    </div>
  )
}
