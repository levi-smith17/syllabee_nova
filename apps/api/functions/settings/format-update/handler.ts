import { QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
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

        const body = JSON.parse(event.body ?? '{}')
        const label = body.label?.trim()
        if (!label) return toApiGatewayResponse(badRequest('label is required'))

        const res = await dynamo.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'pk = :pk AND sk = :sk',
            ExpressionAttributeValues: { ':pk': 'SETTINGS', ':sk': `FORMAT#${id}` },
            Limit: 1,
        }))
        if (!res.Items?.length) return toApiGatewayResponse(notFound('Format not found'))

        await dynamo.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { pk: 'SETTINGS', sk: `FORMAT#${id}` },
            UpdateExpression: 'SET label = :label',
            ExpressionAttributeValues: { ':label': label },
        }))

        return toApiGatewayResponse(ok({ id, label }))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
