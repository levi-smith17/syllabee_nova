import { CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { isAdmin } from '../../shared/auth'
import { toApiGatewayResponse, ok, forbidden, serverError } from '../../shared/response'

const cognito = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION ?? 'us-east-1' })
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID ?? ''

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        if (!isAdmin(event)) return toApiGatewayResponse(forbidden())

        const allUsers: any[] = []
        let paginationToken: string | undefined
        do {
            const res = await cognito.send(new ListUsersCommand({
                UserPoolId: USER_POOL_ID,
                PaginationToken: paginationToken,
            }))
            allUsers.push(...(res.Users ?? []))
            paginationToken = res.PaginationToken
        } while (paginationToken)

        const users = allUsers.map(u => {
            const attr = (name: string) => u.Attributes?.find((a: any) => a.Name === name)?.Value ?? null
            return {
                id: attr('sub') ?? u.Username,
                email: attr('email') ?? null,
                name: attr('name') ?? null,
                status: u.UserStatus ?? 'UNKNOWN',
                enabled: u.Enabled ?? true,
                createdAt: u.UserCreateDate?.toISOString() ?? null,
            }
        })

        return toApiGatewayResponse(ok(users))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
