import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'crypto'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { getUserId } from '../../shared/auth'
import { toApiGatewayResponse, created, badRequest, serverError } from '../../shared/response'

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        const body = JSON.parse(event.body ?? '{}')
        const { name, grades } = body

        if (!name) return toApiGatewayResponse(badRequest('name is required'))
        if (!Array.isArray(grades) || grades.length === 0) {
            return toApiGatewayResponse(badRequest('grades must be a non-empty array'))
        }

        for (const g of grades) {
            if (!g.letter || typeof g.minPercent !== 'number' || typeof g.maxPercent !== 'number') {
                return toApiGatewayResponse(badRequest('Each grade must have letter, minPercent, and maxPercent'))
            }
        }

        const id = randomUUID()
        const now = new Date().toISOString()
        const ownerId = getUserId(event)

        await dynamo.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                pk: `GRADESCALE#${id}`,
                sk: 'METADATA',
                id,
                name: String(name),
                ownerId,
                createdAt: now,
            },
        }))

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

        return toApiGatewayResponse(created({ id }))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
