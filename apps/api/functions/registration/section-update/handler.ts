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

        const newCourseId = courseId !== undefined ? String(courseId) : (item.courseId as string)
        const newTermId = termId !== undefined ? String(termId) : (item.termId as string)
        const newSectionCode = sectionCode !== undefined ? String(sectionCode) : (item.sectionCode as string)

        await dynamo.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { pk: `SECTION#${id}`, sk: 'METADATA' },
            UpdateExpression: 'SET courseId = :courseId, termId = :termId, sectionCode = :sectionCode, gsi1pk = :g1pk, gsi1sk = :g1sk, formatId = :formatId, instructorId = :instructorId, roomNumber = :roomNumber, meetingDays = :meetingDays, meetingTime = :meetingTime, isActive = :isActive',
            ExpressionAttributeValues: {
                ':courseId': newCourseId,
                ':termId': newTermId,
                ':sectionCode': newSectionCode,
                ':g1pk': `SECTION_LOOKUP#${newCourseId}#${newTermId}`,
                ':g1sk': newSectionCode,
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
