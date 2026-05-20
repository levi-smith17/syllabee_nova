import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { isAdmin } from '../../shared/auth'
import { toApiGatewayResponse, ok, forbidden, serverError } from '../../shared/response'

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        if (!isAdmin(event)) return toApiGatewayResponse(forbidden())

        const items: any[] = []
        let lastKey: Record<string, any> | undefined
        do {
            const res = await dynamo.send(new ScanCommand({
                TableName: TABLE_NAME,
                FilterExpression: 'begins_with(pk, :prefix) AND sk = :sk',
                ExpressionAttributeValues: { ':prefix': 'SECTION#', ':sk': 'METADATA' },
                ExclusiveStartKey: lastKey,
            }))
            items.push(...(res.Items ?? []))
            lastKey = res.LastEvaluatedKey
        } while (lastKey)

        const sections = items.map(item => ({
            id: item.pk.replace('SECTION#', ''),
            courseId: item.courseId,
            termId: item.termId,
            sectionCode: item.sectionCode,
            formatId: item.formatId ?? null,
            instructorId: item.instructorId ?? null,
            roomNumber: item.roomNumber ?? null,
            meetingDays: item.meetingDays ?? null,
            meetingTime: item.meetingTime ?? null,
            isActive: item.isActive ?? true,
            createdAt: item.createdAt,
        }))

        return toApiGatewayResponse(ok(sections))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
