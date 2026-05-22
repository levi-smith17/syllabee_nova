import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { toApiGatewayResponse, ok, serverError } from '../../shared/response'

// GET /admin/quick-links
// Public endpoint — returns all quick links. Frontend filters by `restricted` field
// to show general links to all users and staff links only to instructors/admins.
export const handler = async (
    _event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
    try {
        const res = await dynamo.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
            ExpressionAttributeValues: { ':pk': 'SETTINGS', ':prefix': 'QUICKLINK#' },
        }))

        const quickLinks = (res.Items ?? [])
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
            .map(item => ({
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
