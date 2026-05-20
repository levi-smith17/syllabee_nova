import { GetCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { getUserId, getUserEmail } from '../../shared/auth'
import { toApiGatewayResponse, ok, serverError } from '../../shared/response'

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        const sub = getUserId(event)
        const email = getUserEmail(event)
        const name = (event.requestContext.authorizer.jwt.claims.name as string) ?? null

        const res = await dynamo.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { pk: `USER#${sub}`, sk: 'METADATA' },
        }))

        const item = res.Item

        return toApiGatewayResponse(ok({
            id: sub,
            email,
            name,
            isAdmin: item?.isAdmin ?? false,
            createdAt: item?.createdAt ?? null,
        }))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
