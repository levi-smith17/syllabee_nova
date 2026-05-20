import { GetCommand, DeleteCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { toApiGatewayResponse, noContent, badRequest, notFound, serverError } from '../../shared/response'

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        const internshipId = event.pathParameters?.id
        const entryId = event.pathParameters?.entryId
        if (!internshipId || !entryId) {
            return toApiGatewayResponse(badRequest('internshipId and entryId are required'))
        }

        const entry = await dynamo.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { pk: `INTERNSHIP#${internshipId}`, sk: `JOURNAL#${entryId}` },
        }))

        if (!entry.Item) return toApiGatewayResponse(notFound('Journal entry not found'))

        await dynamo.send(new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { pk: `INTERNSHIP#${internshipId}`, sk: `JOURNAL#${entryId}` },
        }))

        // Recalculate completedHours from remaining entries
        const remaining = await dynamo.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
            ExpressionAttributeValues: {
                ':pk': `INTERNSHIP#${internshipId}`,
                ':prefix': 'JOURNAL#',
            },
        }))

        const totalMinutes = (remaining.Items ?? []).reduce((sum: number, i: any) => sum + (i.totalMinutes ?? 0), 0)
        const completedHours = parseFloat((totalMinutes / 60).toFixed(2))

        await dynamo.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { pk: `INTERNSHIP#${internshipId}`, sk: 'METADATA' },
            UpdateExpression: 'SET completedHours = :hours',
            ExpressionAttributeValues: { ':hours': completedHours },
        }))

        return toApiGatewayResponse(noContent())
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
