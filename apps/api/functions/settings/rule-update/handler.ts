import { QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { isAdmin, getPathId } from '../../shared/auth'
import { toApiGatewayResponse, ok, badRequest, forbidden, notFound, serverError } from '../../shared/response'

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        if (!await isAdmin(event)) return toApiGatewayResponse(forbidden())

        // :id here is the rule id (UUID)
        const id = getPathId(event)
        if (!id) return toApiGatewayResponse(badRequest('id is required'))

        const body = JSON.parse(event.body ?? '{}')
        const { formatId } = body
        if (!formatId) return toApiGatewayResponse(badRequest('formatId is required'))

        // Find the rule by scanning RULE# sk prefix for matching id
        const rulesRes = await dynamo.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
            FilterExpression: 'id = :id',
            ExpressionAttributeValues: { ':pk': 'SETTINGS', ':prefix': 'RULE#', ':id': id },
            Limit: 1,
        }))
        const rule = rulesRes.Items?.[0]
        if (!rule) return toApiGatewayResponse(notFound('Rule not found'))

        // Resolve new format label
        const formatRes = await dynamo.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'pk = :pk AND sk = :sk',
            ExpressionAttributeValues: { ':pk': 'SETTINGS', ':sk': `FORMAT#${formatId}` },
            Limit: 1,
        }))
        const format = formatRes.Items?.[0]
        if (!format) return toApiGatewayResponse(badRequest('formatId not found'))

        await dynamo.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { pk: 'SETTINGS', sk: rule.sk },
            UpdateExpression: 'SET formatId = :formatId, formatLabel = :formatLabel',
            ExpressionAttributeValues: { ':formatId': formatId, ':formatLabel': format.label },
        }))

        return toApiGatewayResponse(ok({ id, digit: rule.digit, formatId, formatLabel: format.label }))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
