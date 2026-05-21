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
        const targetSyllabusId = getPathId(event)
        if (!targetSyllabusId) return toApiGatewayResponse(notFound('Syllabus not found'))

        const body = JSON.parse(event.body ?? '{}')
        const { sourceSyllabusId, sourceSegmentId, sections } = body
        if (!sourceSyllabusId || !sourceSegmentId) {
            return toApiGatewayResponse(badRequest('sourceSyllabusId and sourceSegmentId are required'))
        }

        const userId = getUserId(event)
        const adminUser = await isAdmin(event)

        // Verify target syllabus ownership and lock status
        const targetRes = await dynamo.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { pk: `SYLLABUS#${targetSyllabusId}`, sk: 'METADATA' },
        }))
        if (!targetRes.Item) return toApiGatewayResponse(notFound('Target syllabus not found'))
        if (targetRes.Item.ownerId !== userId && !adminUser) return toApiGatewayResponse(forbidden())
        if (targetRes.Item.locked) return toApiGatewayResponse(conflict('Target syllabus is locked'))

        // Verify source syllabus access
        const sourceRes = await dynamo.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { pk: `SYLLABUS#${sourceSyllabusId}`, sk: 'METADATA' },
        }))
        if (!sourceRes.Item) return toApiGatewayResponse(notFound('Source syllabus not found'))
        if (sourceRes.Item.ownerId !== userId && !adminUser) return toApiGatewayResponse(forbidden())

        // Fetch source segment
        const segRes = await dynamo.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { pk: `SYLLABUS#${sourceSyllabusId}`, sk: `SEG#${sourceSegmentId}` },
        }))
        if (!segRes.Item) return toApiGatewayResponse(notFound('Source segment not found'))

        // Fetch source blocks ordered by sortOrder
        const blkRes = await dynamo.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
            ExpressionAttributeValues: {
                ':pk': `SYLLABUS#${sourceSyllabusId}`,
                ':prefix': `BLK#${sourceSegmentId}#`,
            },
        }))
        const sourceBlocks = (blkRes.Items ?? []).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

        // Compute next sortOrder in target
        const existingSegsRes = await dynamo.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
            ExpressionAttributeValues: { ':pk': `SYLLABUS#${targetSyllabusId}`, ':prefix': 'SEG#' },
            ProjectionExpression: 'sortOrder',
        }))
        const maxSegOrder = (existingSegsRes.Items ?? []).reduce((m, i) => Math.max(m, i.sortOrder ?? 0), -1)

        // Create new segment
        const newSegId = randomUUID()
        const seg = segRes.Item
        await dynamo.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                pk: `SYLLABUS#${targetSyllabusId}`,
                sk: `SEG#${newSegId}`,
                id: newSegId,
                name: seg.name,
                description: seg.description ?? null,
                printHeading: seg.printHeading ?? 2,
                printingOptional: seg.printingOptional ?? false,
                isVisible: false,
                sections: sections ?? [],
                sortOrder: maxSegOrder + 1,
            },
        }))

        // Deep copy all blocks into new segment
        for (let i = 0; i < sourceBlocks.length; i++) {
            const b = sourceBlocks[i]
            const newBlockId = randomUUID()
            await dynamo.send(new PutCommand({
                TableName: TABLE_NAME,
                Item: {
                    pk: `SYLLABUS#${targetSyllabusId}`,
                    sk: `BLK#${newSegId}#${newBlockId}`,
                    id: newBlockId,
                    type: b.type,
                    name: b.name,
                    isVisible: b.isVisible ?? true,
                    printHeading: b.printHeading ?? 3,
                    content: b.content ?? {},
                    published: false,
                    sortOrder: i,
                },
            }))
        }

        return toApiGatewayResponse(created({ id: newSegId }))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
