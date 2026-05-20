import {
    CognitoIdentityProviderClient,
    AdminUpdateUserAttributesCommand,
    AdminAddUserToGroupCommand,
    AdminRemoveUserFromGroupCommand,
    AdminListGroupsForUserCommand,
} from '@aws-sdk/client-cognito-identity-provider'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { isAdmin, getPathId } from '../../shared/auth'
import { toApiGatewayResponse, ok, badRequest, forbidden, serverError } from '../../shared/response'

const cognito = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION ?? 'us-east-1' })
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID ?? ''

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        if (!await isAdmin(event)) return toApiGatewayResponse(forbidden())

        const email = getPathId(event)
        if (!email) return toApiGatewayResponse(badRequest('user email is required'))

        const body = JSON.parse(event.body ?? '{}')
        const { name, role } = body

        if (name !== undefined) {
            await cognito.send(new AdminUpdateUserAttributesCommand({
                UserPoolId: USER_POOL_ID,
                Username: email,
                UserAttributes: [{ Name: 'name', Value: String(name) }],
            }))
        }

        if (role !== undefined) {
            const groupsRes = await cognito.send(new AdminListGroupsForUserCommand({
                UserPoolId: USER_POOL_ID,
                Username: email,
            }))
            const inAdmin = groupsRes.Groups?.some(g => g.GroupName === 'Admin') ?? false

            if (role === 'ADMIN' && !inAdmin) {
                await cognito.send(new AdminAddUserToGroupCommand({
                    UserPoolId: USER_POOL_ID,
                    Username: email,
                    GroupName: 'Admin',
                }))
            } else if (role !== 'ADMIN' && inAdmin) {
                await cognito.send(new AdminRemoveUserFromGroupCommand({
                    UserPoolId: USER_POOL_ID,
                    Username: email,
                    GroupName: 'Admin',
                }))
            }
        }

        return toApiGatewayResponse(ok({ email }))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
