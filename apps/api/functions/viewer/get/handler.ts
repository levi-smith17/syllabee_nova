import { ScanCommand, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { toApiGatewayResponse, ok, notFound, serverError } from '../../shared/response'

// GET /viewer/:courseCode/:sectionCode/:termCode
// Public endpoint — returns syllabus viewer data for a given section.
export const handler = async (
    event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
    try {
        const courseCode = event.pathParameters?.courseCode
        const termCode = event.pathParameters?.termCode
        const sectionCode = event.pathParameters?.sectionCode

        if (!courseCode || !termCode || !sectionCode) {
            return toApiGatewayResponse(notFound('Section not found'))
        }

        const upperCourse = courseCode.toUpperCase()
        const upperTerm = termCode.toUpperCase()

        // ── Resolve courseId ──────────────────────────────────────────────────
        let courseId: string | undefined
        let coursePk: string | undefined

        const courseGsi = await dynamo.send(new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: 'gsi1',
            KeyConditionExpression: 'gsi1pk = :g1pk AND gsi1sk = :g1sk',
            ExpressionAttributeValues: { ':g1pk': 'TYPE#COURSE', ':g1sk': upperCourse },
            ProjectionExpression: 'pk',
            Limit: 1,
        }))

        if (courseGsi.Items?.length) {
            coursePk = courseGsi.Items[0].pk as string
        } else {
            const courseScan = await dynamo.send(new ScanCommand({
                TableName: TABLE_NAME,
                FilterExpression: 'begins_with(pk, :prefix) AND sk = :sk AND #code = :code',
                ExpressionAttributeNames: { '#code': 'code' },
                ExpressionAttributeValues: { ':prefix': 'COURSE#', ':sk': 'METADATA', ':code': upperCourse },
                ProjectionExpression: 'pk',
            }))
            coursePk = courseScan.Items?.[0]?.pk as string | undefined
        }

        if (!coursePk) return toApiGatewayResponse(notFound('Section not found'))
        courseId = coursePk.replace('COURSE#', '')

        // ── Resolve termId + termName ─────────────────────────────────────────
        let termId: string | undefined
        let termName: string | undefined

        const termGsi = await dynamo.send(new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: 'gsi1',
            KeyConditionExpression: 'gsi1pk = :g1pk AND gsi1sk = :g1sk',
            ExpressionAttributeValues: { ':g1pk': 'TYPE#TERM', ':g1sk': upperTerm },
            Limit: 1,
        }))

        if (termGsi.Items?.length) {
            const t = termGsi.Items[0]
            termId = (t.pk as string).replace('TERM#', '')
            termName = t.name as string
        } else {
            const termScan = await dynamo.send(new ScanCommand({
                TableName: TABLE_NAME,
                FilterExpression: 'begins_with(pk, :prefix) AND sk = :sk AND #code = :code',
                ExpressionAttributeNames: { '#code': 'code', '#name': 'name' },
                ExpressionAttributeValues: { ':prefix': 'TERM#', ':sk': 'METADATA', ':code': upperTerm },
                ProjectionExpression: 'pk, #name',
            }))
            const t = termScan.Items?.[0]
            if (t) {
                termId = (t.pk as string).replace('TERM#', '')
                termName = t.name as string
            }
        }

        if (!termId) return toApiGatewayResponse(notFound('Section not found'))

        // ── Resolve sectionId ─────────────────────────────────────────────────
        let sectionItem: Record<string, unknown> | undefined

        const sectionGsi = await dynamo.send(new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: 'gsi1',
            KeyConditionExpression: 'gsi1pk = :g1pk AND gsi1sk = :g1sk',
            FilterExpression: 'isActive = :active',
            ExpressionAttributeValues: {
                ':g1pk': `SECTION_LOOKUP#${courseId}#${termId}`,
                ':g1sk': sectionCode,
                ':active': true,
            },
            Limit: 1,
        }))

        if (sectionGsi.Items?.length) {
            sectionItem = sectionGsi.Items[0] as Record<string, unknown>
        } else {
            const sectionScan = await dynamo.send(new ScanCommand({
                TableName: TABLE_NAME,
                FilterExpression: 'begins_with(pk, :prefix) AND sk = :sk AND courseId = :cid AND termId = :tid AND sectionCode = :sc AND isActive = :active',
                ExpressionAttributeValues: {
                    ':prefix': 'SECTION#',
                    ':sk': 'METADATA',
                    ':cid': courseId,
                    ':tid': termId,
                    ':sc': sectionCode,
                    ':active': true,
                },
            }))
            sectionItem = sectionScan.Items?.[0] as Record<string, unknown> | undefined
        }

        if (!sectionItem) return toApiGatewayResponse(notFound('Section not found'))

        const sectionId = (sectionItem.pk as string).replace('SECTION#', '')

        const masterSyllabusId = sectionItem.masterSyllabusId as string | undefined
        if (!masterSyllabusId) {
            return toApiGatewayResponse(notFound('No syllabus assigned to this section'))
        }

        // ── Fetch course name, syllabus data, and branding in parallel ────────
        const [courseDetail, syllabusRes, brandingItem] = await Promise.all([
            dynamo.send(new GetCommand({
                TableName: TABLE_NAME,
                Key: { pk: `COURSE#${courseId}`, sk: 'METADATA' },
                ProjectionExpression: '#n',
                ExpressionAttributeNames: { '#n': 'name' },
            })),
            dynamo.send(new QueryCommand({
                TableName: TABLE_NAME,
                KeyConditionExpression: 'pk = :pk',
                ExpressionAttributeValues: { ':pk': `SYLLABUS#${masterSyllabusId}` },
            })),
            dynamo.send(new GetCommand({
                TableName: TABLE_NAME,
                Key: { pk: 'SETTINGS', sk: 'BRANDING' },
            })),
        ])

        const syllabusItems = syllabusRes.Items ?? []
        const syllabusMetadata = syllabusItems.find(i => i.sk === 'METADATA')
        if (!syllabusMetadata) return toApiGatewayResponse(notFound('Syllabus not found'))

        const segItems = syllabusItems.filter(i => (i.sk as string).startsWith('SEG#'))
        const blkItems = syllabusItems.filter(i => (i.sk as string).startsWith('BLK#'))

        const allSegments = segItems
            .sort((a, b) => (a.sortOrder as number) - (b.sortOrder as number))
            .map(seg => {
                const segId = (seg.sk as string).replace('SEG#', '')
                const blocks = blkItems
                    .filter(b => (b.sk as string).startsWith(`BLK#${segId}#`))
                    .sort((a, b) => (a.sortOrder as number) - (b.sortOrder as number))
                    .map(b => ({
                        id: b.id,
                        syllabusId: masterSyllabusId,
                        segmentId: segId,
                        type: b.type,
                        name: b.name,
                        sortOrder: b.sortOrder,
                        printHeading: b.printHeading,
                        printGroup: b.printGroup,
                        content: b.content ?? {},
                    }))
                return {
                    id: seg.id,
                    syllabusId: masterSyllabusId,
                    name: seg.name,
                    description: seg.description,
                    printHeading: seg.printHeading,
                    printingOptional: seg.printingOptional,
                    isVisible: seg.isVisible as boolean ?? true,
                    sortOrder: seg.sortOrder,
                    sections: (seg.sections as string[]) ?? [],
                    blocks,
                }
            })

        // Filter to segments applicable to this section
        const applicable = allSegments.filter(seg =>
            seg.sections.length === 0 || seg.sections.includes(sectionId)
        )

        const isAvailable = applicable.every(seg => seg.isVisible)

        const branding = brandingItem.Item
            ? { institutionName: (brandingItem.Item.institutionName as string) ?? null }
            : { institutionName: null }

        return toApiGatewayResponse(ok({
            syllabus: {
                id: masterSyllabusId,
                title: syllabusMetadata.title,
                termCode: syllabusMetadata.termCode,
                officeHours: syllabusMetadata.officeHours,
                interactiveView: syllabusMetadata.interactiveView ?? false,
                timeout: syllabusMetadata.timeout ?? 0,
                prohibitBacktracking: syllabusMetadata.prohibitBacktracking ?? false,
                maxAttempts: syllabusMetadata.maxAttempts ?? 1,
                maxPoints: syllabusMetadata.maxPoints ?? 0,
                randomizeResponses: syllabusMetadata.randomizeResponses ?? false,
                pointsLadder: syllabusMetadata.pointsLadder ?? false,
                pointsLadderDeduction: syllabusMetadata.pointsLadderDeduction ?? 0,
            },
            section: {
                courseCode,
                termCode,
                sectionCode,
                courseName: (courseDetail.Item?.name as string) ?? '',
                termName: termName ?? '',
                instructorId: sectionItem.instructorId as string,
            },
            segments: applicable,
            branding,
            isAvailable,
        }))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
