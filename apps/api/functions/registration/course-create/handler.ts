import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'crypto'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { isAdmin } from '../../shared/auth'
import { toApiGatewayResponse, created, badRequest, conflict, forbidden, serverError } from '../../shared/response'

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        if (!await isAdmin(event)) return toApiGatewayResponse(forbidden())

        const body = JSON.parse(event.body ?? '{}')
        const { code, title, description, creditHours, isInternship } = body

        if (!code || !title || creditHours === undefined) {
            return toApiGatewayResponse(badRequest('code, title, and creditHours are required'))
        }

        // Check for duplicate code
        const existing = await dynamo.send(new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: 'code-index',
            KeyConditionExpression: 'code = :code',
            ExpressionAttributeValues: { ':code': String(code).toUpperCase() },
            Limit: 1,
        })).catch(() => null)

        if (existing?.Items?.length) {
            return toApiGatewayResponse(conflict('A course with that code already exists'))
        }

        const id = randomUUID()
        const now = new Date().toISOString()

        await dynamo.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                pk: `COURSE#${id}`,
                sk: 'METADATA',
                code: String(code).toUpperCase(),
                title: String(title),
                description: description ?? null,
                creditHours: Number(creditHours),
                isInternship: isInternship ?? false,
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
