import { DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { isAdmin, getPathId } from '../../shared/auth'
import { toApiGatewayResponse, noContent, badRequest, conflict, forbidden, notFound, serverError } from '../../shared/response'

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        if (!await isAdmin(event)) return toApiGatewayResponse(forbidden())

        const id = getPathId(event)
        if (!id) return toApiGatewayResponse(badRequest('id is required'))

        const res = await dynamo.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'pk = :pk AND sk = :sk',
            ExpressionAttributeValues: { ':pk': 'SETTINGS', ':sk': `FORMAT#${id}` },
            Limit: 1,
        }))
        if (!res.Items?.length) return toApiGatewayResponse(notFound('Format not found'))

        // Block delete if any sections reference this format
        const sectionCheck = await dynamo.send(new ScanCommand({
            TableName: TABLE_NAME,
            FilterExpression: 'begins_with(pk, :prefix) AND sk = :sk AND formatId = :formatId',
            ExpressionAttributeValues: { ':prefix': 'SECTION#', ':sk': 'METADATA', ':formatId': id },
            Limit: 1,
        }))
        if (sectionCheck.Items?.length) {
            return toApiGatewayResponse(conflict('Cannot delete a format that is assigned to a section'))
        }

        // Also block if any section code rules reference this format
        const ruleCheck = await dynamo.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
            FilterExpression: 'formatId = :formatId',
            ExpressionAttributeValues: { ':pk': 'SETTINGS', ':prefix': 'RULE#', ':formatId': id },
            Limit: 1,
        }))
        if (ruleCheck.Items?.length) {
            return toApiGatewayResponse(conflict('Cannot delete a format that is assigned to a section code rule'))
        }

        await dynamo.send(new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { pk: 'SETTINGS', sk: `FORMAT#${id}` },
        }))

        return toApiGatewayResponse(noContent())
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
