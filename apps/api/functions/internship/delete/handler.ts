import { QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { getPathId } from '../../shared/auth'
import { toApiGatewayResponse, noContent, badRequest, notFound, serverError } from '../../shared/response'

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        const id = getPathId(event)
        if (!id) return toApiGatewayResponse(badRequest('id is required'))

        const res = await dynamo.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'pk = :pk',
            ExpressionAttributeValues: { ':pk': `INTERNSHIP#${id}` },
        }))

        const items = res.Items ?? []
        if (!items.some(i => i.sk === 'METADATA')) {
            return toApiGatewayResponse(notFound('Internship not found'))
        }

        await Promise.all(
            items.map(item =>
                dynamo.send(new DeleteCommand({
                    TableName: TABLE_NAME,
                    Key: { pk: item.pk, sk: item.sk },
                }))
            )
        )

        return toApiGatewayResponse(noContent())
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
