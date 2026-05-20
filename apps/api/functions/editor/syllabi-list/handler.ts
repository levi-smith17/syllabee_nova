import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { getUserId, isAdmin } from '../../shared/auth'
import { toApiGatewayResponse, ok, serverError } from '../../shared/response'

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        const userId = getUserId(event)
        const admin = await isAdmin(event)

        const params: any = {
            TableName: TABLE_NAME,
            FilterExpression: 'begins_with(pk, :prefix) AND sk = :sk',
            ExpressionAttributeValues: { ':prefix': 'SYLLABUS#', ':sk': 'METADATA' },
        }

        if (!admin) {
            params.FilterExpression += ' AND ownerId = :ownerId'
            params.ExpressionAttributeValues[':ownerId'] = userId
        }

        const items: any[] = []
        let lastKey: Record<string, unknown> | undefined

        do {
            if (lastKey) params.ExclusiveStartKey = lastKey
            const res = await dynamo.send(new ScanCommand(params))
            items.push(...(res.Items ?? []))
            lastKey = res.LastEvaluatedKey
        } while (lastKey)

        return toApiGatewayResponse(ok(items))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
