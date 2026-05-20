import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'crypto'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { getUserId } from '../../shared/auth'
import { toApiGatewayResponse, created, badRequest, serverError } from '../../shared/response'

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        const body = JSON.parse(event.body ?? '{}')
        const { studentId, studentName, studentEmail, sectionId, startDate, endDate } = body

        if (!studentId || !studentName || !studentEmail) {
            return toApiGatewayResponse(badRequest('studentId, studentName, and studentEmail are required'))
        }

        const id = randomUUID()
        const now = new Date().toISOString()
        const createdBy = getUserId(event)

        await dynamo.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                pk: `INTERNSHIP#${id}`,
                sk: 'METADATA',
                id,
                studentId: String(studentId),
                studentName: String(studentName),
                studentEmail: String(studentEmail),
                sectionId: sectionId ?? null,
                status: 'PENDING',
                startDate: startDate ?? null,
                endDate: endDate ?? null,
                completedHours: 0,
                createdAt: now,
                createdBy,
            },
        }))

        return toApiGatewayResponse(created({ id }))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
