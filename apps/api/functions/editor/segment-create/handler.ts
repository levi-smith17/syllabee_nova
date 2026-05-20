import { GetCommand, QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'crypto'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { getUserId, isAdmin, getPathId } from '../../shared/auth'
import { toApiGatewayResponse, created, badRequest, forbidden, notFound, conflict, serverError } from '../../shared/response'

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        const id = getPathId(event)
        if (!id) return toApiGatewayResponse(notFound('Syllabus not found'))

        const body = JSON.parse(event.body ?? '{}')
        const { name, description, printHeading, printingOptional, isVisible } = body
        if (!name) return toApiGatewayResponse(badRequest('name is required'))

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

        // Compute next sortOrder
        const segRes = await dynamo.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
            ExpressionAttributeValues: { ':pk': `SYLLABUS#${id}`, ':prefix': 'SEG#' },
            ProjectionExpression: 'sortOrder',
        }))
        const maxOrder = (segRes.Items ?? []).reduce((m, i) => Math.max(m, i.sortOrder ?? 0), -1)

        const segId = randomUUID()
        await dynamo.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                pk: `SYLLABUS#${id}`,
                sk: `SEG#${segId}`,
                id: segId,
                name: String(name),
                description: description ?? null,
                printHeading: printHeading ?? false,
                printingOptional: printingOptional ?? false,
                isVisible: isVisible ?? true,
                sortOrder: maxOrder + 1,
            },
        }))

        return toApiGatewayResponse(created({ id: segId }))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
