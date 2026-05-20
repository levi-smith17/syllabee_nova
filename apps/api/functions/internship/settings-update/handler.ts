import { GetCommand, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { isAdmin } from '../../shared/auth'
import { toApiGatewayResponse, ok, badRequest, forbidden, serverError } from '../../shared/response'

const DEFAULTS = { requiredHours: 224, journalPoints: 100 }

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        if (!await isAdmin(event)) return toApiGatewayResponse(forbidden())

        const body = JSON.parse(event.body ?? '{}')
        const { requiredHours, journalPoints } = body

        if (requiredHours !== undefined && (typeof requiredHours !== 'number' || requiredHours <= 0)) {
            return toApiGatewayResponse(badRequest('requiredHours must be a positive number'))
        }
        if (journalPoints !== undefined && (typeof journalPoints !== 'number' || journalPoints < 0)) {
            return toApiGatewayResponse(badRequest('journalPoints must be a non-negative number'))
        }
        if (requiredHours === undefined && journalPoints === undefined) {
            return toApiGatewayResponse(badRequest('No updatable fields provided'))
        }

        const existing = await dynamo.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { pk: 'SETTINGS', sk: 'INTERNSHIP' },
        }))

        const current = existing.Item ?? { pk: 'SETTINGS', sk: 'INTERNSHIP', ...DEFAULTS }

        await dynamo.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                ...current,
                requiredHours: requiredHours ?? current.requiredHours,
                journalPoints: journalPoints ?? current.journalPoints,
            },
        }))

        return toApiGatewayResponse(ok({
            requiredHours: requiredHours ?? current.requiredHours,
            journalPoints: journalPoints ?? current.journalPoints,
        }))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
