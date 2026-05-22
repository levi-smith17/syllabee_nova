import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { getUserId, isAdmin, getPathId } from '../../shared/auth'
import { toApiGatewayResponse, ok, forbidden, notFound, serverError } from '../../shared/response'

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        const id = getPathId(event)
        if (!id) return toApiGatewayResponse(notFound('Syllabus not found'))

        const userId = getUserId(event)

        const res = await dynamo.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'pk = :pk',
            ExpressionAttributeValues: { ':pk': `SYLLABUS#${id}` },
        }))

        const items = res.Items ?? []
        const metadata = items.find(i => i.sk === 'METADATA')
        if (!metadata) return toApiGatewayResponse(notFound('Syllabus not found'))

        if (metadata.ownerId !== userId && !await isAdmin(event)) {
            return toApiGatewayResponse(forbidden())
        }

        const segItems = items.filter(i => i.sk.startsWith('SEG#'))
        const blkItems = items.filter(i => i.sk.startsWith('BLK#'))

        const segments = segItems
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map(seg => {
                const segId = seg.sk.replace('SEG#', '')
                const blocks = blkItems
                    .filter(b => b.sk.startsWith(`BLK#${segId}#`))
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map(b => ({
                        id: b.id,
                        syllabusId: id,
                        segmentId: segId,
                        type: b.type,
                        name: b.name,
                        isVisible: b.isVisible,
                        sortOrder: b.sortOrder,
                        printHeading: b.printHeading,
                        printGroup: b.printGroup,
                        content: b.content ?? {},
                        published: b.published ?? false,
                        permalink: b.permalink,
                    }))
                return {
                    id: seg.id,
                    syllabusId: id,
                    name: seg.name,
                    description: seg.description,
                    printHeading: seg.printHeading,
                    printingOptional: seg.printingOptional,
                    isVisible: seg.isVisible,
                    sortOrder: seg.sortOrder,
                    effectiveTerm: seg.effectiveTerm,
                    sections: seg.sections ?? [],
                    blocks,
                }
            })

        return toApiGatewayResponse(ok({ syllabus: metadata, segments }))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
