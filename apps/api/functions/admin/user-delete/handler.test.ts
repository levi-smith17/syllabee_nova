import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from './handler'

const mockSend = vi.hoisted(() => vi.fn())

vi.mock('@aws-sdk/client-cognito-identity-provider', () => ({
    CognitoIdentityProviderClient: function () { return { send: mockSend } },
    AdminDeleteUserCommand: function () {},
}))

const makeEvent = (id?: string) => ({
    requestContext: { authorizer: { jwt: { claims: { sub: 'u1', 'cognito:groups': 'Admin' } } } },
    body: null,
    pathParameters: id ? { id } : {},
} as any)

const nonAdminEvent = {
    requestContext: { authorizer: { jwt: { claims: { sub: 'u1' } } } },
    body: null, pathParameters: {},
} as any

describe('admin/user-delete', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 403 for non-admin', async () => {
        const result = await handler(nonAdminEvent) as any
        expect(result.statusCode).toBe(403)
    })

    it('returns 400 when no path id', async () => {
        const result = await handler(makeEvent()) as any
        expect(result.statusCode).toBe(400)
    })

    it('deletes user and returns 204', async () => {
        mockSend.mockResolvedValueOnce({})
        const result = await handler(makeEvent('user@test.com')) as any
        expect(result.statusCode).toBe(204)
    })

    it('returns 404 for UserNotFoundException', async () => {
        const err = Object.assign(new Error('not found'), { name: 'UserNotFoundException' })
        mockSend.mockRejectedValueOnce(err)
        const result = await handler(makeEvent('ghost@test.com')) as any
        expect(result.statusCode).toBe(404)
    })

    it('returns 500 on unexpected error', async () => {
        mockSend.mockRejectedValueOnce(new Error('fail'))
        const result = await handler(makeEvent('x@test.com')) as any
        expect(result.statusCode).toBe(500)
    })
})
