import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'crypto'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { isAdmin } from '../../shared/auth'
import { toApiGatewayResponse, created, badRequest, forbidden, serverError } from '../../shared/response'

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        if (!await isAdmin(event)) return toApiGatewayResponse(forbidden())

        const body = JSON.parse(event.body ?? '{}')
        const label = body.label?.trim()
        if (!label) return toApiGatewayResponse(badRequest('label is required'))

        const id = randomUUID()

        await dynamo.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: { pk: 'SETTINGS', sk: `FORMAT#${id}`, id, label },
        }))

        return toApiGatewayResponse(created({ id, label }))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
