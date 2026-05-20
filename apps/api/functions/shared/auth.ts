import { GetCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda'
import { dynamo, TABLE_NAME } from './db'

export function getUserId(event: APIGatewayProxyEventV2WithJWTAuthorizer): string {
    return event.requestContext.authorizer.jwt.claims.sub as string
}

export function getUserEmail(event: APIGatewayProxyEventV2WithJWTAuthorizer): string {
    return event.requestContext.authorizer.jwt.claims.email as string
}

export async function isAdmin(event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<boolean> {
    // Fast path: Cognito groups (synchronous, used in tests and as a legacy override)
    const groups = event.requestContext.authorizer.jwt.claims['cognito:groups']
    if (groups) {
        const list = Array.isArray(groups) ? groups : String(groups).split(',')
        if (list.includes('Admin')) return true
    }

    // Primary: DDB isAdmin flag on the user record
    const sub = getUserId(event)
    try {
        const res = await dynamo.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { pk: `USER#${sub}`, sk: 'METADATA' },
            ProjectionExpression: 'isAdmin',
        }))
        return res.Item?.isAdmin === true
    } catch {
        return false
    }
}

export function getPathId(event: APIGatewayProxyEventV2WithJWTAuthorizer): string | undefined {
    return event.pathParameters?.id
}
