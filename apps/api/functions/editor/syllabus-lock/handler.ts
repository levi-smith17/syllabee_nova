import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { getUserId, isAdmin, getPathId } from '../../shared/auth'
import { toApiGatewayResponse, ok, badRequest, forbidden, notFound, serverError } from '../../shared/response'

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        const id = getPathId(event)
        if (!id) return toApiGatewayResponse(notFound('Syllabus not found'))

        const body = JSON.parse(event.body ?? '{}')
        if (typeof body.locked !== 'boolean') {
            return toApiGatewayResponse(badRequest('locked (boolean) is required'))
        }

        const userId = getUserId(event)

        const existing = await dynamo.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { pk: `SYLLABUS#${id}`, sk: 'METADATA' },
        }))
        if (!existing.Item) return toApiGatewayResponse(notFound('Syllabus not found'))
        if (existing.Item.ownerId !== userId && !await isAdmin(event)) {
            return toApiGatewayResponse(forbidden())
        }

        await dynamo.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { pk: `SYLLABUS#${id}`, sk: 'METADATA' },
            UpdateExpression: 'SET #locked = :locked',
            ExpressionAttributeNames: { '#locked': 'locked' },
            ExpressionAttributeValues: { ':locked': body.locked },
        }))

        return toApiGatewayResponse(ok({ id, locked: body.locked }))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
