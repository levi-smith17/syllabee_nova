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
            Key: { pk: `COURSE#${id}`, sk: 'METADATA' },
        }))
        if (!existing.Item) return toApiGatewayResponse(notFound('Course not found'))

        const body = JSON.parse(event.body ?? '{}')
        const { code, title, description, creditHours, isInternship, isActive } = body

        await dynamo.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { pk: `COURSE#${id}`, sk: 'METADATA' },
            UpdateExpression: 'SET #code = :code, title = :title, description = :description, creditHours = :creditHours, isInternship = :isInternship, isActive = :isActive',
            ExpressionAttributeNames: { '#code': 'code' },
            ExpressionAttributeValues: {
                ':code': code !== undefined ? String(code).toUpperCase() : existing.Item.code,
                ':title': title !== undefined ? String(title) : existing.Item.title,
                ':description': description !== undefined ? description : existing.Item.description,
                ':creditHours': creditHours !== undefined ? Number(creditHours) : existing.Item.creditHours,
                ':isInternship': isInternship !== undefined ? Boolean(isInternship) : existing.Item.isInternship,
                ':isActive': isActive !== undefined ? Boolean(isActive) : existing.Item.isActive,
            },
        }))

        return toApiGatewayResponse(ok({ id }))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
