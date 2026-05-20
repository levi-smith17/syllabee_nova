import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { getPathId } from '../../shared/auth'
import { toApiGatewayResponse, ok, badRequest, notFound, serverError } from '../../shared/response'

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        const id = getPathId(event)
        if (!id) return toApiGatewayResponse(badRequest('id is required'))

        const res = await dynamo.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'pk = :pk',
            ExpressionAttributeValues: { ':pk': `INTERNSHIP#${id}` },
        }))

        const items = res.Items ?? []
        const metadata = items.find(i => i.sk === 'METADATA')
        if (!metadata) return toApiGatewayResponse(notFound('Internship not found'))

        const locations = items
            .filter(i => i.sk.startsWith('LOCATION#'))
            .map(i => ({
                id: i.id,
                employerName: i.employerName,
                address: i.address ?? null,
                city: i.city ?? null,
                state: i.state ?? null,
                zip: i.zip ?? null,
                supervisorName: i.supervisorName ?? null,
                supervisorEmail: i.supervisorEmail ?? null,
                supervisorPhone: i.supervisorPhone ?? null,
                validated: i.validated ?? false,
                createdAt: i.createdAt,
            }))

        const journalEntries = items
            .filter(i => i.sk.startsWith('JOURNAL#'))
            .map(i => ({
                id: i.id,
                locationId: i.locationId ?? null,
                title: i.title,
                description: i.description,
                date: i.date,
                timeStart: i.timeStart,
                timeEnd: i.timeEnd,
                totalMinutes: i.totalMinutes,
                verified: i.verified ?? false,
                createdAt: i.createdAt,
            }))
            .sort((a, b) => a.date.localeCompare(b.date))

        return toApiGatewayResponse(ok({
            internship: {
                id: metadata.id,
                studentId: metadata.studentId,
                studentName: metadata.studentName,
                studentEmail: metadata.studentEmail,
                sectionId: metadata.sectionId ?? null,
                status: metadata.status,
                startDate: metadata.startDate ?? null,
                endDate: metadata.endDate ?? null,
                completedHours: metadata.completedHours ?? 0,
                createdAt: metadata.createdAt,
                createdBy: metadata.createdBy,
            },
            locations,
            journalEntries,
        }))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
