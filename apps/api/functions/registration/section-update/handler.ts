import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { isAdmin, getPathId } from '../../shared/auth'
import { toApiGatewayResponse, ok, badRequest, forbidden, notFound, serverError } from '../../shared/response'

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        if (!await isAdmin(event)) return toApiGatewayResponse(forbidden())

        const id = getPathId(event)
        if (!id) return toApiGatewayResponse(badRequest('id is required'))

        const existing = await dynamo.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { pk: `SECTION#${id}`, sk: 'METADATA' },
        }))
        if (!existing.Item) return toApiGatewayResponse(notFound('Section not found'))

        const body = JSON.parse(event.body ?? '{}')
        const { courseId, termId, sectionCode, formatId, instructorId, roomNumber, meetingDays, meetingTime, isActive } = body
        const item = existing.Item

        await dynamo.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { pk: `SECTION#${id}`, sk: 'METADATA' },
            UpdateExpression: 'SET courseId = :courseId, termId = :termId, sectionCode = :sectionCode, formatId = :formatId, instructorId = :instructorId, roomNumber = :roomNumber, meetingDays = :meetingDays, meetingTime = :meetingTime, isActive = :isActive',
            ExpressionAttributeValues: {
                ':courseId': courseId !== undefined ? String(courseId) : item.courseId,
                ':termId': termId !== undefined ? String(termId) : item.termId,
                ':sectionCode': sectionCode !== undefined ? String(sectionCode) : item.sectionCode,
                ':formatId': formatId !== undefined ? formatId : item.formatId,
                ':instructorId': instructorId !== undefined ? instructorId : item.instructorId,
                ':roomNumber': roomNumber !== undefined ? roomNumber : item.roomNumber,
                ':meetingDays': meetingDays !== undefined ? meetingDays : item.meetingDays,
                ':meetingTime': meetingTime !== undefined ? meetingTime : item.meetingTime,
                ':isActive': isActive !== undefined ? Boolean(isActive) : item.isActive,
            },
        }))

        return toApiGatewayResponse(ok({ id }))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
