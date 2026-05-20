import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from './handler'

const mockSend = vi.hoisted(() => vi.fn())

vi.mock('../../shared/db', () => ({
    dynamo: { send: mockSend },
    TABLE_NAME: 'test-table',
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

describe('settings/rule-delete', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 403 for non-admin', async () => {
        const result = await handler(nonAdminEvent) as any
        expect(result.statusCode).toBe(403)
    })

    it('returns 400 when no id', async () => {
        const result = await handler(makeEvent()) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 404 when rule not found', async () => {
        mockSend.mockResolvedValueOnce({ Items: [] })
        const result = await handler(makeEvent('r1')) as any
        expect(result.statusCode).toBe(404)
    })

    it('deletes rule and returns 204', async () => {
        mockSend
            .mockResolvedValueOnce({ Items: [{ sk: 'RULE#1', id: 'r1', digit: '1' }] })
            .mockResolvedValueOnce({})

        const result = await handler(makeEvent('r1')) as any
        expect(result.statusCode).toBe(204)
    })

    it('returns 500 on error', async () => {
        mockSend.mockRejectedValueOnce(new Error('fail'))
        const result = await handler(makeEvent('r1')) as any
        expect(result.statusCode).toBe(500)
    })
})
