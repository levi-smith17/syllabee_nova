import { GetCommand, QueryCommand, DeleteCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'crypto'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { getUserId, isAdmin, getPathId } from '../../shared/auth'
import { toApiGatewayResponse, ok, badRequest, forbidden, notFound, serverError } from '../../shared/response'

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        const id = getPathId(event)
        if (!id) return toApiGatewayResponse(notFound('Grading scale not found'))

        const body = JSON.parse(event.body ?? '{}')
        const { name, grades } = body

        if (!name && !grades) {
            return toApiGatewayResponse(badRequest('name or grades is required'))
        }

        const userId = getUserId(event)

        const existing = await dynamo.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { pk: `GRADESCALE#${id}`, sk: 'METADATA' },
        }))
        if (!existing.Item) return toApiGatewayResponse(notFound('Grading scale not found'))
        if (existing.Item.ownerId !== userId && !await isAdmin(event)) {
            return toApiGatewayResponse(forbidden())
        }

        if (name) {
            await dynamo.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { pk: `GRADESCALE#${id}`, sk: 'METADATA' },
                UpdateExpression: 'SET #name = :name',
                ExpressionAttributeNames: { '#name': 'name' },
                ExpressionAttributeValues: { ':name': String(name) },
            }))
        }

        if (grades) {
            if (!Array.isArray(grades) || grades.length === 0) {
                return toApiGatewayResponse(badRequest('grades must be a non-empty array'))
            }
            for (const g of grades) {
                if (!g.letter || typeof g.minPercent !== 'number' || typeof g.maxPercent !== 'number') {
                    return toApiGatewayResponse(badRequest('Each grade must have letter, minPercent, and maxPercent'))
                }
            }

            // Delete existing grade items
            const gradeRes = await dynamo.send(new QueryCommand({
                TableName: TABLE_NAME,
                KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
                ExpressionAttributeValues: { ':pk': `GRADESCALE#${id}`, ':prefix': 'GRADE#' },
            }))
            await Promise.all((gradeRes.Items ?? []).map(item =>
                dynamo.send(new DeleteCommand({
                    TableName: TABLE_NAME,
                    Key: { pk: item.pk, sk: item.sk },
                }))
            ))

            // Insert new grade items
            await Promise.all(grades.map((g: any) => {
                const gradeId = randomUUID()
                return dynamo.send(new PutCommand({
                    TableName: TABLE_NAME,
                    Item: {
                        pk: `GRADESCALE#${id}`,
                        sk: `GRADE#${gradeId}`,
                        id: gradeId,
                        scaleId: id,
                        letter: String(g.letter),
                        minPercent: Number(g.minPercent),
                        maxPercent: Number(g.maxPercent),
                    },
                }))
            }))
        }

        return toApiGatewayResponse(ok({ id }))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
