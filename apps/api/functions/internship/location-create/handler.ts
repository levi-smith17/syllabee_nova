import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'crypto'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { getPathId } from '../../shared/auth'
import { toApiGatewayResponse, created, badRequest, notFound, serverError } from '../../shared/response'

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        const internshipId = getPathId(event)
        if (!internshipId) return toApiGatewayResponse(badRequest('internshipId is required'))

        const body = JSON.parse(event.body ?? '{}')
        const { employerName, address, city, state, zip, supervisorName, supervisorEmail, supervisorPhone } = body

        if (!employerName) return toApiGatewayResponse(badRequest('employerName is required'))

        const existing = await dynamo.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { pk: `INTERNSHIP#${internshipId}`, sk: 'METADATA' },
        }))

        if (!existing.Item) return toApiGatewayResponse(notFound('Internship not found'))

        const locationId = randomUUID()
        const now = new Date().toISOString()

        await dynamo.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                pk: `INTERNSHIP#${internshipId}`,
                sk: `LOCATION#${locationId}`,
                id: locationId,
                employerName: String(employerName),
                address: address ?? null,
                city: city ?? null,
                state: state ?? null,
                zip: zip ?? null,
                supervisorName: supervisorName ?? null,
                supervisorEmail: supervisorEmail ?? null,
                supervisorPhone: supervisorPhone ?? null,
                validated: false,
                createdAt: now,
            },
        }))

        return toApiGatewayResponse(created({ id: locationId }))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
