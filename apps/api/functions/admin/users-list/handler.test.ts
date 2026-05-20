import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from './handler'

const mockSend = vi.hoisted(() => vi.fn())

vi.mock('@aws-sdk/client-cognito-identity-provider', () => ({
    CognitoIdentityProviderClient: function () { return { send: mockSend } },
    ListUsersCommand: function () {},
}))

const adminEvent = {
    requestContext: { authorizer: { jwt: { claims: { sub: 'u1', email: 'a@test.com', 'cognito:groups': 'Admin' } } } },
    body: null, pathParameters: {},
} as any

const nonAdminEvent = {
    requestContext: { authorizer: { jwt: { claims: { sub: 'u1', email: 'a@test.com' } } } },
    body: null, pathParameters: {},
} as any

describe('admin/users-list', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 403 for non-admin', async () => {
        const result = await handler(nonAdminEvent) as any
        expect(result.statusCode).toBe(403)
    })

    it('returns mapped users', async () => {
        mockSend.mockResolvedValueOnce({
            Users: [{
                Attributes: [
                    { Name: 'sub', Value: 'sub-1' },
                    { Name: 'email', Value: 'user@test.com' },
                    { Name: 'name', Value: 'Test User' },
                ],
                UserStatus: 'CONFIRMED',
                Enabled: true,
                UserCreateDate: new Date('2024-01-01'),
            }],
        })

        const result = await handler(adminEvent) as any
        expect(result.statusCode).toBe(200)
        const { data } = JSON.parse(result.body)
        expect(data).toHaveLength(1)
        expect(data[0]).toMatchObject({ id: 'sub-1', email: 'user@test.com', name: 'Test User', status: 'CONFIRMED', enabled: true })
    })

    it('paginates until no token', async () => {
        const user = { Attributes: [], UserStatus: 'CONFIRMED', Enabled: true, UserCreateDate: new Date() }
        mockSend
            .mockResolvedValueOnce({ Users: [user], PaginationToken: 'tok' })
            .mockResolvedValueOnce({ Users: [user] })

        const result = await handler(adminEvent) as any
        expect(result.statusCode).toBe(200)
        expect(JSON.parse(result.body).data).toHaveLength(2)
        expect(mockSend).toHaveBeenCalledTimes(2)
    })

    it('returns 500 on AWS error', async () => {
        mockSend.mockRejectedValueOnce(new Error('fail'))
        const result = await handler(adminEvent) as any
        expect(result.statusCode).toBe(500)
    })
})
