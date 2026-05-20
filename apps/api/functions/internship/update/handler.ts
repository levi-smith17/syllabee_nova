import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { getPathId } from '../../shared/auth'
import { toApiGatewayResponse, ok, badRequest, notFound, serverError } from '../../shared/response'

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        const id = getPathId(event)
        if (!id) return toApiGatewayResponse(badRequest('id is required'))

        const body = JSON.parse(event.body ?? '{}')
        const { status, startDate, endDate } = body

        const validStatuses = ['PENDING', 'ACTIVE', 'COMPLETED', 'WITHDRAWN']
        if (status !== undefined && !validStatuses.includes(status)) {
            return toApiGatewayResponse(badRequest(`status must be one of: ${validStatuses.join(', ')}`))
        }

        const existing = await dynamo.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { pk: `INTERNSHIP#${id}`, sk: 'METADATA' },
        }))

        if (!existing.Item) return toApiGatewayResponse(notFound('Internship not found'))

        const updates: string[] = []
        const values: Record<string, any> = {}
        const names: Record<string, string> = {}

        if (status !== undefined) {
            updates.push('#status = :status')
            names['#status'] = 'status'
            values[':status'] = status
        }
        if (startDate !== undefined) {
            updates.push('startDate = :startDate')
            values[':startDate'] = startDate
        }
        if (endDate !== undefined) {
            updates.push('endDate = :endDate')
            values[':endDate'] = endDate
        }

        if (updates.length === 0) {
            return toApiGatewayResponse(badRequest('No updatable fields provided'))
        }

        await dynamo.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { pk: `INTERNSHIP#${id}`, sk: 'METADATA' },
            UpdateExpression: `SET ${updates.join(', ')}`,
            ExpressionAttributeValues: values,
            ...(Object.keys(names).length > 0 && { ExpressionAttributeNames: names }),
        }))

        return toApiGatewayResponse(ok({ id }))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
