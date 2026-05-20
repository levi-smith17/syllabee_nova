import { pool } from '@/hooks/use-auth'
import type { CognitoUserSession } from 'amazon-cognito-identity-js'

export async function getAuthHeaders(): Promise<Record<string, string>> {
  return new Promise((resolve) => {
    const cognitoUser = pool.getCurrentUser()
    if (!cognitoUser) return resolve({})

    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session?.isValid()) return resolve({})

      const expiresAt = session.getIdToken().getExpiration() * 1000
      const fiveMinutes = 5 * 60 * 1000
      const needsRefresh = expiresAt - Date.now() < fiveMinutes

      if (!needsRefresh) {
        return resolve({ Authorization: session.getIdToken().getJwtToken() })
      }

      cognitoUser.refreshSession(
        session.getRefreshToken(),
        (refreshErr: Error | null, refreshedSession: CognitoUserSession | null) => {
          if (refreshErr || !refreshedSession) {
            return resolve({ Authorization: session.getIdToken().getJwtToken() })
          }
          resolve({ Authorization: refreshedSession.getIdToken().getJwtToken() })
        }
      )
    })
  })
}
