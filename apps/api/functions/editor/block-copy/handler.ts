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
        const targetSegmentId = event.pathParameters?.segmentId
        if (!targetSyllabusId || !targetSegmentId) {
            return toApiGatewayResponse(notFound('Syllabus or segment not found'))
        }

        const body = JSON.parse(event.body ?? '{}')
        const { sourceSyllabusId, sourceSegmentId, sourceBlockId } = body
        if (!sourceSyllabusId || !sourceSegmentId || !sourceBlockId) {
            return toApiGatewayResponse(badRequest('sourceSyllabusId, sourceSegmentId, and sourceBlockId are required'))
        }

        const userId = getUserId(event)
        const adminUser = await isAdmin(event)

        // Verify target syllabus ownership and lock status
        const targetSyllabusRes = await dynamo.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { pk: `SYLLABUS#${targetSyllabusId}`, sk: 'METADATA' },
        }))
        if (!targetSyllabusRes.Item) return toApiGatewayResponse(notFound('Target syllabus not found'))
        if (targetSyllabusRes.Item.ownerId !== userId && !adminUser) return toApiGatewayResponse(forbidden())
        if (targetSyllabusRes.Item.locked) return toApiGatewayResponse(conflict('Target syllabus is locked'))

        // Verify target segment exists
        const targetSegRes = await dynamo.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { pk: `SYLLABUS#${targetSyllabusId}`, sk: `SEG#${targetSegmentId}` },
        }))
        if (!targetSegRes.Item) return toApiGatewayResponse(notFound('Target segment not found'))

        // Verify source syllabus access
        const sourceSyllabusRes = await dynamo.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { pk: `SYLLABUS#${sourceSyllabusId}`, sk: 'METADATA' },
        }))
        if (!sourceSyllabusRes.Item) return toApiGatewayResponse(notFound('Source syllabus not found'))
        if (sourceSyllabusRes.Item.ownerId !== userId && !adminUser) return toApiGatewayResponse(forbidden())

        // Fetch source block
        const blkRes = await dynamo.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { pk: `SYLLABUS#${sourceSyllabusId}`, sk: `BLK#${sourceSegmentId}#${sourceBlockId}` },
        }))
        if (!blkRes.Item) return toApiGatewayResponse(notFound('Source block not found'))

        // Compute next sortOrder in target segment
        const existingBlksRes = await dynamo.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
            ExpressionAttributeValues: {
                ':pk': `SYLLABUS#${targetSyllabusId}`,
                ':prefix': `BLK#${targetSegmentId}#`,
            },
            ProjectionExpression: 'sortOrder',
        }))
        const maxOrder = (existingBlksRes.Items ?? []).reduce((m, i) => Math.max(m, i.sortOrder ?? 0), -1)

        const b = blkRes.Item
        const newBlockId = randomUUID()
        await dynamo.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                pk: `SYLLABUS#${targetSyllabusId}`,
                sk: `BLK#${targetSegmentId}#${newBlockId}`,
                id: newBlockId,
                type: b.type,
                name: b.name,
                isVisible: b.isVisible ?? true,
                printHeading: b.printHeading ?? 3,
                content: b.content ?? {},
                published: false,
                sortOrder: maxOrder + 1,
            },
        }))

        return toApiGatewayResponse(created({ id: newBlockId }))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
