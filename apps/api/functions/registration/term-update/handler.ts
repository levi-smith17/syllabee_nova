import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { isAdmin, getPathId } from '../../shared/auth'
import { toApiGatewayResponse, ok, badRequest, forbidden, notFound, serverError } from '../../shared/response'

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        if (!isAdmin(event)) return toApiGatewayResponse(forbidden())

        const id = getPathId(event)
        if (!id) return toApiGatewayResponse(badRequest('id is required'))

        const existing = await dynamo.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { pk: `TERM#${id}`, sk: 'METADATA' },
        }))
        if (!existing.Item) return toApiGatewayResponse(notFound('Term not found'))

        const body = JSON.parse(event.body ?? '{}')
        const { name, code, startDate, endDate, isActive } = body

        await dynamo.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { pk: `TERM#${id}`, sk: 'METADATA' },
            UpdateExpression: 'SET #name = :name, #code = :code, startDate = :startDate, endDate = :endDate, isActive = :isActive',
            ExpressionAttributeNames: { '#name': 'name', '#code': 'code' },
            ExpressionAttributeValues: {
                ':name': name !== undefined ? String(name) : existing.Item.name,
                ':code': code !== undefined ? String(code).toUpperCase() : existing.Item.code,
                ':startDate': startDate !== undefined ? String(startDate) : existing.Item.startDate,
                ':endDate': endDate !== undefined ? String(endDate) : existing.Item.endDate,
                ':isActive': isActive !== undefined ? Boolean(isActive) : existing.Item.isActive,
            },
        }))

        return toApiGatewayResponse(ok({ id }))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
