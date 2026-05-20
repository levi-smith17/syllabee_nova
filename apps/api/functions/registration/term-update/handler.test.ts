import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from './handler'

const mockSend = vi.hoisted(() => vi.fn())

vi.mock('../../shared/db', () => ({
    dynamo: { send: mockSend },
    TABLE_NAME: 'test-table',
}))

const existingItem = { pk: 'TERM#t1', name: 'Fall 2024', code: 'FA24', startDate: '2024-08-19', endDate: '2024-12-13', isActive: true }

const makeEvent = (id: string | undefined, body: object) => ({
    requestContext: { authorizer: { jwt: { claims: { sub: 'u1', 'cognito:groups': 'Admin' } } } },
    body: JSON.stringify(body),
    pathParameters: id ? { id } : {},
} as any)

const nonAdminEvent = {
    requestContext: { authorizer: { jwt: { claims: { sub: 'u1' } } } },
    body: null, pathParameters: {},
} as any

describe('registration/term-update', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 403 for non-admin', async () => {
        const result = await handler(nonAdminEvent) as any
        expect(result.statusCode).toBe(403)
    })

    it('returns 400 when no id', async () => {
        const result = await handler(makeEvent(undefined, {})) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 404 when term not found', async () => {
        mockSend.mockResolvedValueOnce({ Item: undefined })
        const result = await handler(makeEvent('t1', { name: 'New' })) as any
        expect(result.statusCode).toBe(404)
    })

    it('updates term and returns 200', async () => {
        mockSend
            .mockResolvedValueOnce({ Item: existingItem })
            .mockResolvedValueOnce({})

        const result = await handler(makeEvent('t1', { name: 'Spring 2025' })) as any
        expect(result.statusCode).toBe(200)
        expect(JSON.parse(result.body).data).toMatchObject({ id: 't1' })
    })

    it('returns 500 on error', async () => {
        mockSend.mockRejectedValueOnce(new Error('fail'))
        const result = await handler(makeEvent('t1', { name: 'X' })) as any
        expect(result.statusCode).toBe(500)
    })
})
