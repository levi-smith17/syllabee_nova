import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { getPathId } from '../../shared/auth'
import { toApiGatewayResponse, ok, badRequest, serverError } from '../../shared/response'

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        const internshipId = getPathId(event)
        if (!internshipId) return toApiGatewayResponse(badRequest('internshipId is required'))

        const body = JSON.parse(event.body ?? '{}')
        const { entryIds, verified } = body

        if (!Array.isArray(entryIds) || entryIds.length === 0) {
            return toApiGatewayResponse(badRequest('entryIds must be a non-empty array'))
        }
        if (typeof verified !== 'boolean') {
            return toApiGatewayResponse(badRequest('verified must be a boolean'))
        }

        await Promise.all(
            entryIds.map((entryId: string) =>
                dynamo.send(new UpdateCommand({
                    TableName: TABLE_NAME,
                    Key: { pk: `INTERNSHIP#${internshipId}`, sk: `JOURNAL#${entryId}` },
                    UpdateExpression: 'SET verified = :verified',
                    ExpressionAttributeValues: { ':verified': verified },
                }))
            )
        )

        return toApiGatewayResponse(ok({ updated: entryIds.length }))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
