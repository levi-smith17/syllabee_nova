import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda'

export function getUserId(event: APIGatewayProxyEventV2WithJWTAuthorizer): string {
    return event.requestContext.authorizer.jwt.claims.sub as string
}

export function getUserEmail(event: APIGatewayProxyEventV2WithJWTAuthorizer): string {
    return event.requestContext.authorizer.jwt.claims.email as string
}

export function isAdmin(event: APIGatewayProxyEventV2WithJWTAuthorizer): boolean {
    const groups = event.requestContext.authorizer.jwt.claims['cognito:groups']
    if (!groups) return false
    const list = Array.isArray(groups) ? groups : String(groups).split(',')
    return list.includes('Admin')
}

export function getPathId(event: APIGatewayProxyEventV2WithJWTAuthorizer): string | undefined {
    return event.pathParameters?.id
}
