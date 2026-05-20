import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from './handler'

const mockSend = vi.hoisted(() => vi.fn())

vi.mock('@aws-sdk/client-cognito-identity-provider', () => ({
    CognitoIdentityProviderClient: function () { return { send: mockSend } },
    AdminUpdateUserAttributesCommand: function () {},
    AdminListGroupsForUserCommand: function () {},
    AdminAddUserToGroupCommand: function () {},
    AdminRemoveUserFromGroupCommand: function () {},
}))

const makeEvent = (id: string, body: object) => ({
    requestContext: { authorizer: { jwt: { claims: { sub: 'u1', 'cognito:groups': 'Admin' } } } },
    body: JSON.stringify(body),
    pathParameters: { id },
} as any)

const nonAdminEvent = {
    requestContext: { authorizer: { jwt: { claims: { sub: 'u1' } } } },
    body: null, pathParameters: {},
} as any

describe('admin/user-update', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 403 for non-admin', async () => {
        const result = await handler(nonAdminEvent) as any
        expect(result.statusCode).toBe(403)
    })

    it('returns 400 when no path id', async () => {
        const result = await handler({
            ...makeEvent('', {}),
            pathParameters: {},
        }) as any
        expect(result.statusCode).toBe(400)
    })

    it('updates name and returns 200', async () => {
        mockSend.mockResolvedValueOnce({})

        const result = await handler(makeEvent('user@test.com', { name: 'New Name' })) as any
        expect(result.statusCode).toBe(200)
        expect(JSON.parse(result.body).data).toMatchObject({ email: 'user@test.com' })
    })

    it('promotes user to Admin when role=ADMIN and not in group', async () => {
        mockSend
            .mockResolvedValueOnce({ Groups: [] })
            .mockResolvedValueOnce({})

        const result = await handler(makeEvent('user@test.com', { role: 'ADMIN' })) as any
        expect(result.statusCode).toBe(200)
        expect(mockSend).toHaveBeenCalledTimes(2)
    })

    it('demotes user from Admin when role changes away from ADMIN', async () => {
        mockSend
            .mockResolvedValueOnce({ Groups: [{ GroupName: 'Admin' }] })
            .mockResolvedValueOnce({})

        const result = await handler(makeEvent('user@test.com', { role: 'INSTRUCTOR' })) as any
        expect(result.statusCode).toBe(200)
        expect(mockSend).toHaveBeenCalledTimes(2)
    })

    it('returns 500 on error', async () => {
        mockSend.mockRejectedValueOnce(new Error('fail'))
        const result = await handler(makeEvent('user@test.com', { name: 'x' })) as any
        expect(result.statusCode).toBe(500)
    })
})
