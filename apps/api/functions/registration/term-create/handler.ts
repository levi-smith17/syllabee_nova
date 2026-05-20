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
        const { name, code, startDate, endDate } = body

        if (!name || !code || !startDate || !endDate) {
            return toApiGatewayResponse(badRequest('name, code, startDate, and endDate are required'))
        }

        const id = randomUUID()
        const now = new Date().toISOString()

        await dynamo.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                pk: `TERM#${id}`,
                sk: 'METADATA',
                name: String(name),
                code: String(code).toUpperCase(),
                startDate: String(startDate),
                endDate: String(endDate),
                isActive: true,
                createdAt: now,
            },
        }))

        return toApiGatewayResponse(created({ id }))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
