import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from './handler'

const mockSend = vi.hoisted(() => vi.fn())

vi.mock('@aws-sdk/client-cognito-identity-provider', () => ({
    CognitoIdentityProviderClient: function () { return { send: mockSend } },
    AdminCreateUserCommand: function (input: any) { this.input = input },
    AdminAddUserToGroupCommand: function (input: any) { this.input = input },
}))

const makeEvent = (body: object) => ({
    requestContext: { authorizer: { jwt: { claims: { sub: 'u1', 'cognito:groups': 'Admin' } } } },
    body: JSON.stringify(body),
    pathParameters: {},
} as any)

const nonAdminEvent = {
    requestContext: { authorizer: { jwt: { claims: { sub: 'u1' } } } },
    body: null, pathParameters: {},
} as any

describe('admin/user-create', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 403 for non-admin', async () => {
        const result = await handler(nonAdminEvent) as any
        expect(result.statusCode).toBe(403)
    })

    it('returns 400 when email is missing', async () => {
        const result = await handler(makeEvent({})) as any
        expect(result.statusCode).toBe(400)
    })

    it('creates user and returns 201', async () => {
        mockSend.mockResolvedValueOnce({ User: { Attributes: [{ Name: 'sub', Value: 'new-sub' }] } })

        const result = await handler(makeEvent({ email: 'new@test.com', name: 'New User' })) as any
        expect(result.statusCode).toBe(201)
        expect(JSON.parse(result.body).data).toMatchObject({ id: 'new-sub', email: 'new@test.com' })
        expect(mockSend).toHaveBeenCalledTimes(1)
    })

    it('also adds user to Admin group when role=ADMIN', async () => {
        mockSend
            .mockResolvedValueOnce({ User: { Attributes: [{ Name: 'sub', Value: 'sub1' }] } })
            .mockResolvedValueOnce({})

        await handler(makeEvent({ email: 'admin@test.com', role: 'ADMIN' }))
        expect(mockSend).toHaveBeenCalledTimes(2)
    })

    it('returns 409 for duplicate email (UsernameExistsException)', async () => {
        const err = Object.assign(new Error('exists'), { name: 'UsernameExistsException' })
        mockSend.mockRejectedValueOnce(err)
        const result = await handler(makeEvent({ email: 'dup@test.com' })) as any
        expect(result.statusCode).toBe(409)
    })

    it('returns 500 on unexpected error', async () => {
        mockSend.mockRejectedValueOnce(new Error('fail'))
        const result = await handler(makeEvent({ email: 'x@test.com' })) as any
        expect(result.statusCode).toBe(500)
    })
})
