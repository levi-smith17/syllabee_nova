import { GetCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { getUserId, isAdmin, getPathId } from '../../shared/auth'
import { toApiGatewayResponse, noContent, forbidden, notFound, conflict, serverError } from '../../shared/response'
import {
    MasterSyllabusConflictError,
    syncAfterSegmentDelete,
} from '../../shared/sync-section-syllabus'

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        const id = getPathId(event)
        const segmentId = event.pathParameters?.segmentId
        if (!id || !segmentId) return toApiGatewayResponse(notFound('Syllabus or segment not found'))

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

        const segItem = await dynamo.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { pk: `SYLLABUS#${id}`, sk: `SEG#${segmentId}` },
            ProjectionExpression: 'sections',
        }))
        const deletedSections = (segItem.Item?.sections as string[]) ?? []

        // Collect the SEG# item + all BLK#segmentId# items
        const blkRes = await dynamo.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
            ExpressionAttributeValues: { ':pk': `SYLLABUS#${id}`, ':prefix': `BLK#${segmentId}#` },
        }))

        const itemsToDelete = [
            { pk: `SYLLABUS#${id}`, sk: `SEG#${segmentId}` },
            ...(blkRes.Items ?? []).map(b => ({ pk: b.pk, sk: b.sk })),
        ]

        await Promise.all(itemsToDelete.map(key =>
            dynamo.send(new DeleteCommand({ TableName: TABLE_NAME, Key: key }))
        ))

        await syncAfterSegmentDelete({
            syllabusId: id,
            termCode: existing.Item.termCode as string | null | undefined,
            deletedSections,
        })

        return toApiGatewayResponse(noContent())
    } catch (err) {
        if (err instanceof MasterSyllabusConflictError) {
            return toApiGatewayResponse(conflict(err.message))
        }
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
