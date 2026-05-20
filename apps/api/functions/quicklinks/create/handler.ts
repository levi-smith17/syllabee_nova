import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'crypto'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { isAdmin } from '../../shared/auth'
import { toApiGatewayResponse, created, badRequest, forbidden, serverError } from '../../shared/response'

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        if (!await isAdmin(event)) return toApiGatewayResponse(forbidden())

        const body = JSON.parse(event.body ?? '{}')
        const { label, url, icon, restricted } = body

        if (!label || !url) return toApiGatewayResponse(badRequest('label and url are required'))

        const countRes = await dynamo.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
            ExpressionAttributeValues: { ':pk': 'SETTINGS', ':prefix': 'QUICKLINK#' },
            Select: 'COUNT',
        }))
        const sortOrder = countRes.Count ?? 0

        const id = randomUUID()

        await dynamo.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                pk: 'SETTINGS',
                sk: `QUICKLINK#${String(sortOrder).padStart(6, '0')}#${id}`,
                id,
                label: String(label),
                url: String(url),
                icon: icon ?? null,
                restricted: restricted ?? false,
                sortOrder,
            },
        }))

        return toApiGatewayResponse(created({ id }))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
