import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from './handler'

const mockSend = vi.hoisted(() => vi.fn())

vi.mock('../../shared/db', () => ({
    dynamo: { send: mockSend },
    TABLE_NAME: 'test-table',
}))

vi.mock('../../shared/auth', () => ({
    getUserId: () => 'instructor-1',
    getPathId: (event: any) => event.pathParameters?.id,
}))

const makeEvent = (id?: string) => ({
    requestContext: { authorizer: { jwt: { claims: { sub: 'instructor-1' } } } },
    body: null,
    pathParameters: id ? { id } : {},
} as any)

describe('internship/delete', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 400 when id is missing', async () => {
        const result = await handler(makeEvent()) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 404 when internship not found', async () => {
        mockSend.mockResolvedValueOnce({ Items: [] })
        const result = await handler(makeEvent('i1')) as any
        expect(result.statusCode).toBe(404)
    })

    it('deletes internship and all sub-items, returns 204', async () => {
        const items = [
            { pk: 'INTERNSHIP#i1', sk: 'METADATA' },
            { pk: 'INTERNSHIP#i1', sk: 'LOCATION#loc1' },
            { pk: 'INTERNSHIP#i1', sk: 'JOURNAL#j1' },
        ]
        mockSend
            .mockResolvedValueOnce({ Items: items })
            .mockResolvedValue({})
        const result = await handler(makeEvent('i1')) as any
        expect(result.statusCode).toBe(204)
        expect(mockSend).toHaveBeenCalledTimes(4) // 1 query + 3 deletes
    })

    it('returns 500 on DynamoDB error', async () => {
        mockSend.mockRejectedValueOnce(new Error('DynamoDB error'))
        const result = await handler(makeEvent('i1')) as any
        expect(result.statusCode).toBe(500)
    })
})
