import { GetCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { toApiGatewayResponse, noContent, badRequest, notFound, conflict, serverError } from '../../shared/response'

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        const internshipId = event.pathParameters?.id
        const locationId = event.pathParameters?.locationId
        if (!internshipId || !locationId) {
            return toApiGatewayResponse(badRequest('internshipId and locationId are required'))
        }

        const existing = await dynamo.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { pk: `INTERNSHIP#${internshipId}`, sk: `LOCATION#${locationId}` },
        }))

        if (!existing.Item) return toApiGatewayResponse(notFound('Location not found'))

        // Reject if any journal entries reference this location
        const journalRes = await dynamo.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
            FilterExpression: 'locationId = :locationId',
            ExpressionAttributeValues: {
                ':pk': `INTERNSHIP#${internshipId}`,
                ':prefix': 'JOURNAL#',
                ':locationId': locationId,
            },
        }))

        if ((journalRes.Items?.length ?? 0) > 0) {
            return toApiGatewayResponse(conflict('Cannot delete a location that has journal entries'))
        }

        await dynamo.send(new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { pk: `INTERNSHIP#${internshipId}`, sk: `LOCATION#${locationId}` },
        }))

        return toApiGatewayResponse(noContent())
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
