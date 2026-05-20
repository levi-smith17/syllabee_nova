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
        const {
            title, termCode, officeHours,
            interactiveView, timeout, prohibitBacktracking,
            maxAttempts, maxPoints, randomizeResponses,
            pointsLadder, pointsLadderDeduction,
        } = body

        if (!title) {
            return toApiGatewayResponse(badRequest('title is required'))
        }

        const id = randomUUID()
        const now = new Date().toISOString()
        const ownerId = getUserId(event)

        await dynamo.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                pk: `SYLLABUS#${id}`,
                sk: 'METADATA',
                id,
                title: String(title),
                termCode: termCode ?? null,
                officeHours: officeHours ?? null,
                interactiveView: interactiveView ?? false,
                timeout: timeout ?? 0,
                prohibitBacktracking: prohibitBacktracking ?? false,
                maxAttempts: maxAttempts ?? 1,
                maxPoints: maxPoints ?? 100,
                randomizeResponses: randomizeResponses ?? false,
                pointsLadder: pointsLadder ?? false,
                pointsLadderDeduction: pointsLadderDeduction ?? 0,
                locked: false,
                ownerId,
                createdAt: now,
            },
        }))

        return toApiGatewayResponse(created({ id }))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
