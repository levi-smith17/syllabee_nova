import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
  CognitoUserSession,
} from 'amazon-cognito-identity-js'
import { useEffect, useState } from 'react'

export interface AuthUser {
  id: string
  email: string
  name?: string
}

export type SignInResult =
  | { type: 'success'; user: AuthUser }
  | { type: 'newPasswordRequired'; cognitoUser: CognitoUser }

let _pool: CognitoUserPool | null = null
function getPool(): CognitoUserPool {
  if (!_pool) {
    _pool = new CognitoUserPool({
      ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID ?? '',
      UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID ?? '',
    })
  }
  return _pool
}

// Thin proxy so auth-headers.ts can import `pool` without causing early init
export const pool = {
  getCurrentUser: () => getPool().getCurrentUser(),
}

function sessionToUser(session: CognitoUserSession): AuthUser {
  const payload = session.getIdToken().decodePayload()
  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name ?? undefined,
  }
}

export function getAuthError(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code: string }).code
    const message = (err as { message?: string }).message ?? ''
    switch (code) {
      case 'NotAuthorizedException':
        return 'Incorrect email or password.'
      case 'UserNotFoundException':
        return 'No account found with that email.'
      case 'CodeMismatchException':
        return 'Incorrect verification code.'
      case 'ExpiredCodeException':
        return 'This code has expired. Please request a new one.'
      case 'LimitExceededException':
        return 'Too many attempts. Please try again later.'
      case 'InvalidPasswordException':
        return message
      default:
        return message || 'Something went wrong. Please try again.'
    }
  }
  if (err instanceof Error) return err.message || 'Something went wrong. Please try again.'
  return 'Something went wrong. Please try again.'
}

const DEV_USER: AuthUser = {
  id: 'dev-user',
  email: 'dev@syllabee.local',
  name: 'Dev User',
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (import.meta.env.VITE_DEV_AUTH_BYPASS === 'true') {
      setUser(DEV_USER)
      setLoading(false)
      return
    }

    const cognitoUser = getPool().getCurrentUser()
    if (!cognitoUser) {
      setLoading(false)
      return
    }
    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session?.isValid()) {
        setLoading(false)
        return
      }
      setUser(sessionToUser(session))
      setLoading(false)
    })
  }, [])

  function signOut() {
    if (import.meta.env.VITE_DEV_AUTH_BYPASS === 'true') return
    getPool().getCurrentUser()?.signOut()
    setUser(null)
  }

  return { user, loading, signOut }
}

export function signIn(email: string, password: string): Promise<SignInResult> {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({ Username: email, Pool: getPool() })
    const authDetails = new AuthenticationDetails({ Username: email, Password: password })

    cognitoUser.authenticateUser(authDetails, {
      onSuccess(session) {
        resolve({ type: 'success', user: sessionToUser(session) })
      },
      onFailure(err) {
        reject(err)
      },
      newPasswordRequired() {
        resolve({ type: 'newPasswordRequired', cognitoUser })
      },
    })
  })
}

export function completeNewPassword(cognitoUser: CognitoUser, newPassword: string): Promise<AuthUser> {
  return new Promise((resolve, reject) => {
    cognitoUser.completeNewPasswordChallenge(newPassword, {}, {
      onSuccess(session) {
        resolve(sessionToUser(session))
      },
      onFailure(err) {
        reject(err)
      },
    })
  })
}

export function forgotPassword(email: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({ Username: email, Pool: getPool() })
    cognitoUser.forgotPassword({
      onSuccess() { resolve() },
      onFailure(err) { reject(err) },
    })
  })
}

export function confirmForgotPassword(email: string, code: string, newPassword: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({ Username: email, Pool: getPool() })
    cognitoUser.confirmPassword(code, newPassword, {
      onSuccess() { resolve() },
      onFailure(err) { reject(err) },
    })
  })
}
