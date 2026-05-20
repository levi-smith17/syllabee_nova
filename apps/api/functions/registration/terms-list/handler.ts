import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { isAdmin } from '../../shared/auth'
import { toApiGatewayResponse, ok, forbidden, serverError } from '../../shared/response'

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        if (!await isAdmin(event)) return toApiGatewayResponse(forbidden())

        const items: any[] = []
        let lastKey: Record<string, any> | undefined
        do {
            const res = await dynamo.send(new ScanCommand({
                TableName: TABLE_NAME,
                FilterExpression: 'begins_with(pk, :prefix) AND sk = :sk',
                ExpressionAttributeValues: { ':prefix': 'TERM#', ':sk': 'METADATA' },
                ExclusiveStartKey: lastKey,
            }))
            items.push(...(res.Items ?? []))
            lastKey = res.LastEvaluatedKey
        } while (lastKey)

        const terms = items.map(item => ({
            id: item.pk.replace('TERM#', ''),
            name: item.name,
            code: item.code,
            startDate: item.startDate,
            endDate: item.endDate,
            isActive: item.isActive ?? true,
            createdAt: item.createdAt,
        }))

        return toApiGatewayResponse(ok(terms))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
