import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminAddUserToGroupCommand } from '@aws-sdk/client-cognito-identity-provider'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { isAdmin } from '../../shared/auth'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { toApiGatewayResponse, created, badRequest, forbidden, serverError } from '../../shared/response'

const cognito = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION ?? 'us-east-1' })
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID ?? ''

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        if (!await isAdmin(event)) return toApiGatewayResponse(forbidden())

        const body = JSON.parse(event.body ?? '{}')
        const { email, name, role } = body

        if (!email) return toApiGatewayResponse(badRequest('email is required'))

        const res = await cognito.send(new AdminCreateUserCommand({
            UserPoolId: USER_POOL_ID,
            Username: email,
            UserAttributes: [
                { Name: 'email', Value: email },
                { Name: 'email_verified', Value: 'true' },
                ...(name ? [{ Name: 'name', Value: name }] : []),
            ],
            DesiredDeliveryMediums: ['EMAIL'],
        }))

        const userId = res.User?.Attributes?.find(a => a.Name === 'sub')?.Value ?? email

        await dynamo.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                pk: `USER#${userId}`,
                sk: 'METADATA',
                email,
                ...(name ? { name } : {}),
                isAdmin: role === 'ADMIN',
                status: 'active',
                createdAt: new Date().toISOString(),
            },
        }))

        if (role === 'ADMIN') {
            await cognito.send(new AdminAddUserToGroupCommand({
                UserPoolId: USER_POOL_ID,
                Username: email,
                GroupName: 'Admin',
            }))
        }

        return toApiGatewayResponse(created({ id: userId, email }))
    } catch (err: any) {
        console.error(err)
        if (err.name === 'UsernameExistsException') {
            return toApiGatewayResponse({ statusCode: 409, error: 'A user with that email already exists' })
        }
        return toApiGatewayResponse(serverError())
    }
}
