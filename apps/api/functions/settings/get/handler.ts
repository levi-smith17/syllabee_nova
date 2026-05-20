import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { isAdmin } from '../../shared/auth'
import { toApiGatewayResponse, ok, forbidden, serverError } from '../../shared/response'

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        if (!isAdmin(event)) return toApiGatewayResponse(forbidden())

        const res = await dynamo.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'pk = :pk',
            ExpressionAttributeValues: { ':pk': 'SETTINGS' },
        }))

        const items = res.Items ?? []

        const branding = items.find(i => i.sk === 'BRANDING') ?? null
        const formats = items
            .filter(i => i.sk.startsWith('FORMAT#'))
            .map(i => ({ id: i.id, label: i.label }))
            .sort((a: any, b: any) => a.label.localeCompare(b.label))
        const rules = items
            .filter(i => i.sk.startsWith('RULE#'))
            .map(i => ({ id: i.id, digit: i.digit, formatId: i.formatId, formatLabel: i.formatLabel }))
            .sort((a: any, b: any) => a.digit.localeCompare(b.digit))
        const termLengths = items
            .filter(i => i.sk.startsWith('TERM_LENGTH#'))
            .map(i => ({ id: i.id, label: i.label, weeks: i.weeks }))
            .sort((a: any, b: any) => a.weeks - b.weeks)

        return toApiGatewayResponse(ok({
            branding: branding ? {
                institutionName: branding.institutionName ?? null,
                primaryColor: branding.primaryColor ?? null,
                secondaryColor: branding.secondaryColor ?? null,
                logoUrl: branding.logoUrl ?? null,
                faviconUrl: branding.faviconUrl ?? null,
            } : null,
            formats,
            rules,
            termLengths,
        }))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
