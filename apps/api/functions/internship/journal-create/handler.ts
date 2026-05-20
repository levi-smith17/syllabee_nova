import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'crypto'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { getPathId } from '../../shared/auth'
import { toApiGatewayResponse, created, badRequest, notFound, serverError } from '../../shared/response'

function isOn15MinBoundary(time: string): boolean {
    const parts = time.split(':')
    if (parts.length !== 2) return false
    const mm = parseInt(parts[1], 10)
    return [0, 15, 30, 45].includes(mm)
}

function minutesBetween(start: string, end: string): number {
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    return (eh * 60 + em) - (sh * 60 + sm)
}

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        const internshipId = getPathId(event)
        if (!internshipId) return toApiGatewayResponse(badRequest('internshipId is required'))

        const body = JSON.parse(event.body ?? '{}')
        const { locationId, title, description, date, timeStart, timeEnd } = body

        if (!title || !description || !date || !timeStart || !timeEnd) {
            return toApiGatewayResponse(badRequest('title, description, date, timeStart, and timeEnd are required'))
        }

        if (!isOn15MinBoundary(timeStart) || !isOn15MinBoundary(timeEnd)) {
            return toApiGatewayResponse(badRequest('timeStart and timeEnd must be on 15-minute boundaries (e.g. 09:00, 09:15, 09:30, 09:45)'))
        }

        const totalMinutes = minutesBetween(timeStart, timeEnd)
        if (totalMinutes <= 0) {
            return toApiGatewayResponse(badRequest('timeEnd must be after timeStart'))
        }

        const internship = await dynamo.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { pk: `INTERNSHIP#${internshipId}`, sk: 'METADATA' },
        }))

        if (!internship.Item) return toApiGatewayResponse(notFound('Internship not found'))

        const entryId = randomUUID()
        const now = new Date().toISOString()

        await dynamo.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                pk: `INTERNSHIP#${internshipId}`,
                sk: `JOURNAL#${entryId}`,
                id: entryId,
                locationId: locationId ?? null,
                title: String(title),
                description: String(description),
                date: String(date),
                timeStart: String(timeStart),
                timeEnd: String(timeEnd),
                totalMinutes,
                verified: false,
                createdAt: now,
            },
        }))

        const newCompletedHours = parseFloat((((internship.Item!.completedHours ?? 0) * 60 + totalMinutes) / 60).toFixed(2))

        await dynamo.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { pk: `INTERNSHIP#${internshipId}`, sk: 'METADATA' },
            UpdateExpression: 'SET completedHours = :hours',
            ExpressionAttributeValues: { ':hours': newCompletedHours },
        }))

        return toApiGatewayResponse(created({ id: entryId, totalMinutes }))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
