import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import {
    CognitoIdentityProviderClient,
    AdminUpdateUserAttributesCommand,
    AdminAddUserToGroupCommand,
    AdminRemoveUserFromGroupCommand,
    AdminListGroupsForUserCommand,
} from '@aws-sdk/client-cognito-identity-provider'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { isAdmin, getPathId } from '../../shared/auth'
import { toApiGatewayResponse, ok, badRequest, forbidden, serverError } from '../../shared/response'

const cognito = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION ?? 'us-east-1' })
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID ?? ''

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        if (!await isAdmin(event)) return toApiGatewayResponse(forbidden())

        const id = getPathId(event)
        if (!id) return toApiGatewayResponse(badRequest('id is required'))

        const body = JSON.parse(event.body ?? '{}')
        const { name, role } = body

        if (name !== undefined) {
            await cognito.send(new AdminUpdateUserAttributesCommand({
                UserPoolId: USER_POOL_ID,
                Username: id,
                UserAttributes: [{ Name: 'name', Value: String(name) }],
            }))
        }

        if (role !== undefined) {
            const groupsRes = await cognito.send(new AdminListGroupsForUserCommand({
                UserPoolId: USER_POOL_ID,
                Username: id,
            }))
            const inAdmin = groupsRes.Groups?.some(g => g.GroupName === 'Admin') ?? false

            if (role === 'ADMIN' && !inAdmin) {
                await cognito.send(new AdminAddUserToGroupCommand({
                    UserPoolId: USER_POOL_ID,
                    Username: id,
                    GroupName: 'Admin',
                }))
            } else if (role !== 'ADMIN' && inAdmin) {
                await cognito.send(new AdminRemoveUserFromGroupCommand({
                    UserPoolId: USER_POOL_ID,
                    Username: id,
                    GroupName: 'Admin',
                }))
            }
        }

        // Sync changed fields to DDB
        const ddbExpressions: string[] = []
        const ddbNames: Record<string, string> = {}
        const ddbValues: Record<string, unknown> = {}

        if (name !== undefined) {
            ddbExpressions.push('#name = :name')
            ddbNames['#name'] = 'name'
            ddbValues[':name'] = name ? String(name) : null
        }
        if (role !== undefined) {
            ddbExpressions.push('isAdmin = :isAdmin')
            ddbValues[':isAdmin'] = role === 'ADMIN'
        }

        if (ddbExpressions.length > 0) {
            await dynamo.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { pk: `USER#${id}`, sk: 'METADATA' },
                UpdateExpression: `SET ${ddbExpressions.join(', ')}`,
                ...(Object.keys(ddbNames).length > 0 ? { ExpressionAttributeNames: ddbNames } : {}),
                ExpressionAttributeValues: ddbValues,
            }))
        }

        return toApiGatewayResponse(ok({ id }))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
