import { ScanCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { getUserId } from '../../shared/auth'
import { toApiGatewayResponse, ok, serverError } from '../../shared/response'

// GET /editor/sections
// Returns active sections where instructorId matches the authenticated user.
export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        const userId = getUserId(event)

        const items: Record<string, unknown>[] = []
        let lastKey: Record<string, unknown> | undefined
        do {
            const res = await dynamo.send(new ScanCommand({
                TableName: TABLE_NAME,
                FilterExpression: 'begins_with(pk, :prefix) AND sk = :sk AND instructorId = :uid AND isActive = :active',
                ExpressionAttributeValues: {
                    ':prefix': 'SECTION#',
                    ':sk': 'METADATA',
                    ':uid': userId,
                    ':active': true,
                },
                ExclusiveStartKey: lastKey,
            }))
            items.push(...((res.Items ?? []) as Record<string, unknown>[]))
            lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined
        } while (lastKey)

        const courseIds = [...new Set(items.map(item => item.courseId as string))]
        const termIds = [...new Set(items.map(item => item.termId as string))]

        const [courseResults, termResults] = await Promise.all([
            Promise.all(courseIds.map(id => dynamo.send(new GetCommand({
                TableName: TABLE_NAME,
                Key: { pk: `COURSE#${id}`, sk: 'METADATA' },
            })))),
            Promise.all(termIds.map(id => dynamo.send(new GetCommand({
                TableName: TABLE_NAME,
                Key: { pk: `TERM#${id}`, sk: 'METADATA' },
            })))),
        ])

        const courseCodeMap = new Map<string, string>()
        courseResults.forEach((res, i) => {
            if (res.Item?.code) courseCodeMap.set(courseIds[i], res.Item.code as string)
        })

        const termCodeMap = new Map<string, string>()
        termResults.forEach((res, i) => {
            if (res.Item?.code) termCodeMap.set(termIds[i], res.Item.code as string)
        })

        const sections = items.map(item => ({
            id: (item.pk as string).replace('SECTION#', ''),
            courseId: item.courseId as string,
            courseCode: courseCodeMap.get(item.courseId as string) ?? '',
            termId: item.termId as string,
            termCode: termCodeMap.get(item.termId as string) ?? '',
            sectionCode: item.sectionCode,
            meetingDays: item.meetingDays ?? null,
            meetingTime: item.meetingTime ?? null,
        }))

        return toApiGatewayResponse(ok(sections))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
