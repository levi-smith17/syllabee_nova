import { PutCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { isAdmin } from '../../shared/auth'
import { toApiGatewayResponse, ok, badRequest, forbidden, serverError } from '../../shared/response'

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        if (!await isAdmin(event)) return toApiGatewayResponse(forbidden())

        const body = JSON.parse(event.body ?? '{}')
        const { institutionName, primaryColor, secondaryColor, logoUrl, faviconUrl } = body

        if (!institutionName) return toApiGatewayResponse(badRequest('institutionName is required'))

        await dynamo.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                pk: 'SETTINGS',
                sk: 'BRANDING',
                institutionName: String(institutionName),
                primaryColor: primaryColor ?? null,
                secondaryColor: secondaryColor ?? null,
                logoUrl: logoUrl ?? null,
                faviconUrl: faviconUrl ?? null,
            },
        }))

        return toApiGatewayResponse(ok(null))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
