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
        if (!isAdmin(event)) return toApiGatewayResponse(forbidden())

        const body = JSON.parse(event.body ?? '{}')
        const { digit, formatId } = body

        if (!digit || !formatId) return toApiGatewayResponse(badRequest('digit and formatId are required'))
        if (!/^[0-9]$/.test(digit)) return toApiGatewayResponse(badRequest('digit must be a single character 0–9'))

        // Enforce one rule per digit
        const existing = await dynamo.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'pk = :pk AND sk = :sk',
            ExpressionAttributeValues: { ':pk': 'SETTINGS', ':sk': `RULE#${digit}` },
            Limit: 1,
        }))
        if (existing.Items?.length) return toApiGatewayResponse(conflict(`A rule for digit "${digit}" already exists`))

        // Resolve format label for denormalised storage
        const formatRes = await dynamo.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'pk = :pk AND sk = :sk',
            ExpressionAttributeValues: { ':pk': 'SETTINGS', ':sk': `FORMAT#${formatId}` },
            Limit: 1,
        }))
        const format = formatRes.Items?.[0]
        if (!format) return toApiGatewayResponse(badRequest('formatId not found'))

        const id = randomUUID()

        await dynamo.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                pk: 'SETTINGS',
                sk: `RULE#${digit}`,
                id,
                digit,
                formatId,
                formatLabel: format.label,
            },
        }))

        return toApiGatewayResponse(created({ id, digit, formatId, formatLabel: format.label }))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
