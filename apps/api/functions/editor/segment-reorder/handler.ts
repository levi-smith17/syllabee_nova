import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { getUserId, isAdmin, getPathId } from '../../shared/auth'
import { toApiGatewayResponse, ok, badRequest, forbidden, notFound, conflict, serverError } from '../../shared/response'

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        const id = getPathId(event)
        if (!id) return toApiGatewayResponse(notFound('Syllabus not found'))

        const body = JSON.parse(event.body ?? '{}')
        const { orderedIds } = body
        if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
            return toApiGatewayResponse(badRequest('orderedIds must be a non-empty array'))
        }

        const userId = getUserId(event)

        const existing = await dynamo.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { pk: `SYLLABUS#${id}`, sk: 'METADATA' },
        }))
        if (!existing.Item) return toApiGatewayResponse(notFound('Syllabus not found'))
        if (existing.Item.ownerId !== userId && !await isAdmin(event)) {
            return toApiGatewayResponse(forbidden())
        }
        if (existing.Item.locked) return toApiGatewayResponse(conflict('Syllabus is locked'))

        await Promise.all(
            orderedIds.map((segId: string, index: number) =>
                dynamo.send(new UpdateCommand({
                    TableName: TABLE_NAME,
                    Key: { pk: `SYLLABUS#${id}`, sk: `SEG#${segId}` },
                    UpdateExpression: 'SET sortOrder = :order',
                    ExpressionAttributeValues: { ':order': index },
                }))
            )
        )

        return toApiGatewayResponse(ok({ id }))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
