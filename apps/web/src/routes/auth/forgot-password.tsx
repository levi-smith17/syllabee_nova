import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { confirmForgotPassword, forgotPassword, getAuthError } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthLayout } from '@/routes/auth/auth-layout'

type Step = 'request' | 'confirm'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('request')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleRequest(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      await forgotPassword(email)
      setStep('confirm')
    } catch (err) {
      setError(getAuthError(err))
    } finally {
      setPending(false)
    }
  }

  async function handleConfirm(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.')
      return
    }
    setPending(true)
    setError(null)
    try {
      await confirmForgotPassword(email, code, newPassword)
      navigate('/login?reset=true')
    } catch (err) {
      setError(getAuthError(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthLayout>
      <p className="text-sm text-muted-foreground text-center">
        {step === 'request' ? 'Enter your email to receive a reset code.' : 'Enter the code sent to your email.'}
      </p>

      {step === 'request' ? (
        <form onSubmit={handleRequest} className="flex flex-col gap-4">
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
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? 'Sending…' : 'Send reset code'}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleConfirm} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="code">Verification code</Label>
            <Input
              id="code"
              type="text"
              placeholder="123456"
              value={code}
              onChange={e => setCode(e.target.value)}
              required
              autoComplete="one-time-code"
            />
          </div>
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
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="••••••••••••"
              value={confirmNewPassword}
              onChange={e => setConfirmNewPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? 'Resetting…' : 'Reset password'}
          </Button>
        </form>
      )}

      <p className="text-sm text-center text-muted-foreground">
        <Link to="/login" className="underline underline-offset-4 hover:text-foreground">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
