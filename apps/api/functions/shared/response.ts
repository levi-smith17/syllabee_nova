import { ApiResponse } from '@syllabee/types'

export function ok<T>(data: T): ApiResponse<T> {
    return { statusCode: 200, data }
}

export function created<T>(data: T): ApiResponse<T> {
    return { statusCode: 201, data }
}

export function noContent(): ApiResponse<never> {
    return { statusCode: 204 }
}

export function badRequest(message = 'Bad request'): ApiResponse<never> {
    return { statusCode: 400, error: message }
}

export function unauthorized(message = 'Unauthorized'): ApiResponse<never> {
    return { statusCode: 401, error: message }
}

export function forbidden(message = 'Forbidden'): ApiResponse<never> {
    return { statusCode: 403, error: message }
}

export function notFound(message = 'Not found'): ApiResponse<never> {
    return { statusCode: 404, error: message }
}

export function conflict(message = 'Conflict'): ApiResponse<never> {
    return { statusCode: 409, error: message }
}

export function serverError(message = 'Internal server error'): ApiResponse<never> {
    return { statusCode: 500, error: message }
}

export function toApiGatewayResponse<T>(response: ApiResponse<T>) {
    return {
        statusCode: response.statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(
            response.error ? { error: response.error } : { data: response.data }
        )
    }
}
