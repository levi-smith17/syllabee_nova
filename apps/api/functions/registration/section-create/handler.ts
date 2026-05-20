import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'crypto'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { isAdmin } from '../../shared/auth'
import { toApiGatewayResponse, created, badRequest, forbidden, serverError } from '../../shared/response'

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        if (!isAdmin(event)) return toApiGatewayResponse(forbidden())

        const body = JSON.parse(event.body ?? '{}')
        const { courseId, termId, sectionCode, formatId, instructorId, roomNumber, meetingDays, meetingTime } = body

        if (!courseId || !termId || !sectionCode) {
            return toApiGatewayResponse(badRequest('courseId, termId, and sectionCode are required'))
        }

        const id = randomUUID()
        const now = new Date().toISOString()

        await dynamo.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                pk: `SECTION#${id}`,
                sk: 'METADATA',
                courseId: String(courseId),
                termId: String(termId),
                sectionCode: String(sectionCode),
                formatId: formatId ?? null,
                instructorId: instructorId ?? null,
                roomNumber: roomNumber ?? null,
                meetingDays: meetingDays ?? null,
                meetingTime: meetingTime ?? null,
                isActive: true,
                createdAt: now,
            },
        }))

        return toApiGatewayResponse(created({ id }))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
