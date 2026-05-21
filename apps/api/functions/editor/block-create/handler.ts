import { GetCommand, QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'crypto'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { getUserId, isAdmin, getPathId } from '../../shared/auth'
import { toApiGatewayResponse, created, badRequest, forbidden, notFound, conflict, serverError } from '../../shared/response'

const VALID_BLOCK_TYPES = [
    'content_block', 'details_block', 'file_block', 'grade_determination_block',
    'list_block', 'schedule_block', 'table_block', 'video_block', 'response_block',
]

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        const id = getPathId(event)
        const segmentId = event.pathParameters?.segmentId
        if (!id || !segmentId) return toApiGatewayResponse(notFound('Syllabus or segment not found'))

        const body = JSON.parse(event.body ?? '{}')
        const { type, name, content, isVisible, printHeading } = body

        if (!type || !VALID_BLOCK_TYPES.includes(type)) {
            return toApiGatewayResponse(badRequest('Valid block type is required'))
        }
        if (!name) return toApiGatewayResponse(badRequest('name is required'))

        const userId = getUserId(event)

        const syllabusRes = await dynamo.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { pk: `SYLLABUS#${id}`, sk: 'METADATA' },
        }))
        if (!syllabusRes.Item) return toApiGatewayResponse(notFound('Syllabus not found'))
        if (syllabusRes.Item.ownerId !== userId && !await isAdmin(event)) {
            return toApiGatewayResponse(forbidden())
        }
        if (syllabusRes.Item.locked) return toApiGatewayResponse(conflict('Syllabus is locked'))

        const segRes = await dynamo.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { pk: `SYLLABUS#${id}`, sk: `SEG#${segmentId}` },
        }))
        if (!segRes.Item) return toApiGatewayResponse(notFound('Segment not found'))

        // Compute next sortOrder among blocks in this segment
        const blkRes = await dynamo.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
            ExpressionAttributeValues: { ':pk': `SYLLABUS#${id}`, ':prefix': `BLK#${segmentId}#` },
            ProjectionExpression: 'sortOrder',
        }))
        const maxOrder = (blkRes.Items ?? []).reduce((m, i) => Math.max(m, i.sortOrder ?? 0), -1)

        const blockId = randomUUID()
        await dynamo.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                pk: `SYLLABUS#${id}`,
                sk: `BLK#${segmentId}#${blockId}`,
                id: blockId,
                type,
                name: String(name),
                isVisible: isVisible ?? true,
                printHeading: printHeading ?? 3,
                content: content ?? {},
                published: false,
                sortOrder: maxOrder + 1,
            },
        }))

        return toApiGatewayResponse(created({ id: blockId }))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
