import { CognitoIdentityProviderClient, AdminDeleteUserCommand } from '@aws-sdk/client-cognito-identity-provider'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { isAdmin, getPathId } from '../../shared/auth'
import { toApiGatewayResponse, noContent, badRequest, forbidden, serverError } from '../../shared/response'

const cognito = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION ?? 'us-east-1' })
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID ?? ''

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        if (!await isAdmin(event)) return toApiGatewayResponse(forbidden())

        const email = getPathId(event)
        if (!email) return toApiGatewayResponse(badRequest('user email is required'))

        await cognito.send(new AdminDeleteUserCommand({
            UserPoolId: USER_POOL_ID,
            Username: email,
        }))

        return toApiGatewayResponse(noContent())
    } catch (err: any) {
        console.error(err)
        if (err.name === 'UserNotFoundException') {
            return toApiGatewayResponse({ statusCode: 404, error: 'User not found' })
        }
        return toApiGatewayResponse(serverError())
    }
}
