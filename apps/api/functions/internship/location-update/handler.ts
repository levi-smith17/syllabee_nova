import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { toApiGatewayResponse, ok, badRequest, notFound, serverError } from '../../shared/response'

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        const internshipId = event.pathParameters?.id
        const locationId = event.pathParameters?.locationId
        if (!internshipId || !locationId) {
            return toApiGatewayResponse(badRequest('internshipId and locationId are required'))
        }

        const body = JSON.parse(event.body ?? '{}')
        const { employerName, address, city, state, zip, supervisorName, supervisorEmail, supervisorPhone, validated } = body

        const existing = await dynamo.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { pk: `INTERNSHIP#${internshipId}`, sk: `LOCATION#${locationId}` },
        }))

        if (!existing.Item) return toApiGatewayResponse(notFound('Location not found'))

        const updates: string[] = []
        const values: Record<string, any> = {}

        const fields: Record<string, any> = {
            employerName, address, city, state, zip,
            supervisorName, supervisorEmail, supervisorPhone, validated,
        }

        for (const [key, val] of Object.entries(fields)) {
            if (val !== undefined) {
                updates.push(`${key} = :${key}`)
                values[`:${key}`] = val
            }
        }

        if (updates.length === 0) {
            return toApiGatewayResponse(badRequest('No updatable fields provided'))
        }

        await dynamo.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { pk: `INTERNSHIP#${internshipId}`, sk: `LOCATION#${locationId}` },
            UpdateExpression: `SET ${updates.join(', ')}`,
            ExpressionAttributeValues: values,
        }))

        return toApiGatewayResponse(ok({ id: locationId }))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
