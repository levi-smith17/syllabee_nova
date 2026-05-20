import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from './handler'

const mockSend = vi.hoisted(() => vi.fn())

vi.mock('../../shared/db', () => ({
    dynamo: { send: mockSend },
    TABLE_NAME: 'test-table',
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

describe('settings/branding-update', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 403 for non-admin', async () => {
        const result = await handler(nonAdminEvent) as any
        expect(result.statusCode).toBe(403)
    })

    it('returns 400 when institutionName is missing', async () => {
        const result = await handler(makeEvent({ primaryColor: '#000' })) as any
        expect(result.statusCode).toBe(400)
    })

    it('saves branding and returns 200', async () => {
        mockSend.mockResolvedValueOnce({})

        const result = await handler(makeEvent({
            institutionName: 'Test University',
            primaryColor: '#003366',
            secondaryColor: '#FFCC00',
        })) as any

        expect(result.statusCode).toBe(200)
        const item = mockSend.mock.calls[0][0].input.Item
        expect(item.pk).toBe('SETTINGS')
        expect(item.sk).toBe('BRANDING')
        expect(item.institutionName).toBe('Test University')
    })

    it('returns 500 on error', async () => {
        mockSend.mockRejectedValueOnce(new Error('fail'))
        const result = await handler(makeEvent({ institutionName: 'X' })) as any
        expect(result.statusCode).toBe(500)
    })
})
