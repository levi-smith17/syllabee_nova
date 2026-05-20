import { DeleteCommand, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { isAdmin, getPathId } from '../../shared/auth'
import { toApiGatewayResponse, noContent, badRequest, conflict, forbidden, notFound, serverError } from '../../shared/response'

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        if (!await isAdmin(event)) return toApiGatewayResponse(forbidden())

        const id = getPathId(event)
        if (!id) return toApiGatewayResponse(badRequest('id is required'))

        const existing = await dynamo.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { pk: `TERM#${id}`, sk: 'METADATA' },
        }))
        if (!existing.Item) return toApiGatewayResponse(notFound('Term not found'))

        const sectionCheck = await dynamo.send(new ScanCommand({
            TableName: TABLE_NAME,
            FilterExpression: 'begins_with(pk, :prefix) AND sk = :sk AND termId = :termId',
            ExpressionAttributeValues: { ':prefix': 'SECTION#', ':sk': 'METADATA', ':termId': id },
            Limit: 1,
        }))
        if (sectionCheck.Items?.length) {
            return toApiGatewayResponse(conflict('Cannot delete a term that has sections'))
        }

        await dynamo.send(new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { pk: `TERM#${id}`, sk: 'METADATA' },
        }))

        return toApiGatewayResponse(noContent())
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
