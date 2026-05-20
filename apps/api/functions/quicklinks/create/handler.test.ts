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

describe('quicklinks/create', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 403 for non-admin', async () => {
        const result = await handler(nonAdminEvent) as any
        expect(result.statusCode).toBe(403)
    })

    it('returns 400 when label or url missing', async () => {
        let result = await handler(makeEvent({ url: 'https://x.com' })) as any
        expect(result.statusCode).toBe(400)

        result = await handler(makeEvent({ label: 'X' })) as any
        expect(result.statusCode).toBe(400)
    })

    it('creates quick link and returns 201 with id', async () => {
        mockSend
            .mockResolvedValueOnce({ Count: 2 })
            .mockResolvedValueOnce({})

        const result = await handler(makeEvent({ label: 'Canvas', url: 'https://canvas.edu' })) as any
        expect(result.statusCode).toBe(201)
        const { data } = JSON.parse(result.body)
        expect(typeof data.id).toBe('string')
    })

    it('returns 500 on error', async () => {
        mockSend.mockRejectedValueOnce(new Error('fail'))
        const result = await handler(makeEvent({ label: 'X', url: 'https://x.com' })) as any
        expect(result.statusCode).toBe(500)
    })
})
