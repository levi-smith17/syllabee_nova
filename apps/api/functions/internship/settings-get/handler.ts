import { GetCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { toApiGatewayResponse, ok, serverError } from '../../shared/response'

const DEFAULTS = { requiredHours: 224, journalPoints: 100 }

export const handler = async (
    _event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        const res = await dynamo.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { pk: 'SETTINGS', sk: 'INTERNSHIP' },
        }))

        const item = res?.Item
        return toApiGatewayResponse(ok({
            requiredHours: item?.requiredHours ?? DEFAULTS.requiredHours,
            journalPoints: item?.journalPoints ?? DEFAULTS.journalPoints,
        }))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
