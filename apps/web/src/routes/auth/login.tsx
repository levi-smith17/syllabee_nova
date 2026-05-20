import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { CognitoUser } from 'amazon-cognito-identity-js'
import { completeNewPassword, getAuthError, signIn, useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthLayout } from '@/routes/auth/auth-layout'

export default function LoginPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [challenge, setChallenge] = useState<CognitoUser | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (loading) return null
  if (user) return <Navigate to="/editor" replace />

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)

    try {
      if (challenge) {
        if (newPassword !== confirmNewPassword) {
          setError('Passwords do not match.')
          setPending(false)
          return
        }
        await completeNewPassword(challenge, newPassword)
        navigate('/editor')
      } else {
        const result = await signIn(email, password)
        if (result.type === 'newPasswordRequired') {
          setChallenge(result.cognitoUser)
        } else {
          navigate('/editor')
        }
      }
    } catch (err: unknown) {
      setError(getAuthError(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthLayout>
      <p className="text-sm text-muted-foreground text-center">
        {challenge
          ? 'Your temporary password has expired. Please set a new password to continue.'
          : 'Sign in to your account'}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {challenge ? (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••••••"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-new-password">Confirm new password</Label>
              <Input
                id="confirm-new-password"
                type="password"
                placeholder="••••••••••••"
                value={confirmNewPassword}
                onChange={e => setConfirmNewPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              At least 12 characters with uppercase, lowercase, numbers, and symbols.
            </p>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={pending} className="w-full">
          {pending
            ? (challenge ? 'Setting password…' : 'Signing in…')
            : (challenge ? 'Set password' : 'Sign in')}
        </Button>
      </form>
    </AuthLayout>
  )
}
