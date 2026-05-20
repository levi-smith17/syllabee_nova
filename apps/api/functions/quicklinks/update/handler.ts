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

        const id = getPathId(event)
        if (!id) return toApiGatewayResponse(badRequest('id is required'))

        const res = await dynamo.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
            FilterExpression: 'id = :id',
            ExpressionAttributeValues: { ':pk': 'SETTINGS', ':prefix': 'QUICKLINK#', ':id': id },
        }))
        const item = res.Items?.[0]
        if (!item) return toApiGatewayResponse(notFound('Quick link not found'))

        const body = JSON.parse(event.body ?? '{}')
        const { label, url, icon, restricted } = body

        await dynamo.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { pk: 'SETTINGS', sk: item.sk },
            UpdateExpression: 'SET label = :label, #url = :url, icon = :icon, restricted = :restricted',
            ExpressionAttributeNames: { '#url': 'url' },
            ExpressionAttributeValues: {
                ':label': label !== undefined ? String(label) : item.label,
                ':url': url !== undefined ? String(url) : item.url,
                ':icon': icon !== undefined ? icon : item.icon,
                ':restricted': restricted !== undefined ? Boolean(restricted) : item.restricted,
            },
        }))

        return toApiGatewayResponse(ok({ id }))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
