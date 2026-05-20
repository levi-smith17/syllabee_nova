import { QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { getUserId, isAdmin, getPathId } from '../../shared/auth'
import { toApiGatewayResponse, noContent, forbidden, notFound, serverError } from '../../shared/response'

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        const id = getPathId(event)
        if (!id) return toApiGatewayResponse(notFound('Grading scale not found'))

        const userId = getUserId(event)

        const res = await dynamo.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'pk = :pk',
            ExpressionAttributeValues: { ':pk': `GRADESCALE#${id}` },
        }))

        const items = res.Items ?? []
        const metadata = items.find(i => i.sk === 'METADATA')
        if (!metadata) return toApiGatewayResponse(notFound('Grading scale not found'))
        if (metadata.ownerId !== userId && !await isAdmin(event)) {
            return toApiGatewayResponse(forbidden())
        }

        await Promise.all(items.map(item =>
            dynamo.send(new DeleteCommand({
                TableName: TABLE_NAME,
                Key: { pk: item.pk, sk: item.sk },
            }))
        ))

        return toApiGatewayResponse(noContent())
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
