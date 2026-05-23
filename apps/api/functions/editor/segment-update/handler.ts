import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { getUserId, isAdmin, getPathId } from '../../shared/auth'
import { toApiGatewayResponse, ok, badRequest, forbidden, notFound, conflict, serverError } from '../../shared/response'
import {
    MasterSyllabusConflictError,
    syncAfterSegmentSectionsChange,
} from '../../shared/sync-section-syllabus'

const UPDATABLE_FIELDS = ['name', 'description', 'printHeading', 'printingOptional', 'isVisible', 'sections'] as const

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        const id = getPathId(event)
        const segmentId = event.pathParameters?.segmentId
        if (!id || !segmentId) return toApiGatewayResponse(notFound('Syllabus or segment not found'))

        const body = JSON.parse(event.body ?? '{}')
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

        const updates = UPDATABLE_FIELDS.filter(f => f in body)
        if (updates.length === 0) return toApiGatewayResponse(badRequest('No updatable fields provided'))

        let previousSections: string[] | undefined
        if ('sections' in body) {
            const segExisting = await dynamo.send(new GetCommand({
                TableName: TABLE_NAME,
                Key: { pk: `SYLLABUS#${id}`, sk: `SEG#${segmentId}` },
                ProjectionExpression: 'sections',
            }))
            previousSections = (segExisting.Item?.sections as string[]) ?? []
        }

        const setExpr = updates.map(f => `#${f} = :${f}`).join(', ')
        const exprNames: Record<string, string> = {}
        const exprValues: Record<string, unknown> = {}
        updates.forEach(f => {
            exprNames[`#${f}`] = f
            exprValues[`:${f}`] = body[f]
        })

        await dynamo.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { pk: `SYLLABUS#${id}`, sk: `SEG#${segmentId}` },
            UpdateExpression: `SET ${setExpr}`,
            ExpressionAttributeNames: exprNames,
            ExpressionAttributeValues: exprValues,
        }))

        if ('sections' in body) {
            await syncAfterSegmentSectionsChange({
                syllabusId: id,
                termCode: existing.Item.termCode as string | null | undefined,
                newSections: body.sections as string[],
                previousSections,
            })
        }

        return toApiGatewayResponse(ok({ id: segmentId }))
    } catch (err) {
        if (err instanceof MasterSyllabusConflictError) {
            return toApiGatewayResponse(conflict(err.message))
        }
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
