import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { isAdmin } from '../../shared/auth'
import { toApiGatewayResponse, ok, forbidden, serverError } from '../../shared/response'

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        if (!await isAdmin(event)) return toApiGatewayResponse(forbidden())

        const res = await dynamo.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
            ExpressionAttributeValues: { ':pk': 'SETTINGS', ':prefix': 'QUICKLINK#' },
        }))

        const quickLinks = (res.Items ?? []).map(item => ({
            id: item.id,
            label: item.label,
            url: item.url,
            icon: item.icon ?? null,
            restricted: item.restricted ?? false,
            sortOrder: item.sortOrder ?? 0,
        }))

        return toApiGatewayResponse(ok(quickLinks))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
