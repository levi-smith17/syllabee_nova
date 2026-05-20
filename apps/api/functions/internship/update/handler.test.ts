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

const makeEvent = (id: string | undefined, body: object) => ({
    requestContext: { authorizer: { jwt: { claims: { sub: 'instructor-1' } } } },
    body: JSON.stringify(body),
    pathParameters: id ? { id } : {},
} as any)

describe('internship/update', () => {
    beforeEach(() => vi.resetAllMocks())

    it('returns 400 when id is missing', async () => {
        const result = await handler(makeEvent(undefined, { status: 'ACTIVE' })) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 400 for invalid status', async () => {
        const result = await handler(makeEvent('i1', { status: 'INVALID' })) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 400 when no updatable fields provided', async () => {
        mockSend.mockResolvedValueOnce({ Item: { pk: 'INTERNSHIP#i1', sk: 'METADATA' } })
        const result = await handler(makeEvent('i1', {})) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 404 when internship not found', async () => {
        mockSend.mockResolvedValueOnce({ Item: null })
        const result = await handler(makeEvent('i1', { status: 'ACTIVE' })) as any
        expect(result.statusCode).toBe(404)
    })

    it('updates status and returns 200', async () => {
        mockSend
            .mockResolvedValueOnce({ Item: { pk: 'INTERNSHIP#i1', sk: 'METADATA' } })
            .mockResolvedValueOnce({})
        const result = await handler(makeEvent('i1', { status: 'ACTIVE' })) as any
        expect(result.statusCode).toBe(200)
        const { data } = JSON.parse(result.body)
        expect(data.id).toBe('i1')
    })

    it('updates startDate and endDate', async () => {
        mockSend
            .mockResolvedValueOnce({ Item: { pk: 'INTERNSHIP#i1', sk: 'METADATA' } })
            .mockResolvedValueOnce({})
        const result = await handler(makeEvent('i1', { startDate: '2025-01-01', endDate: '2025-05-31' })) as any
        expect(result.statusCode).toBe(200)
    })

    it('returns 500 on DynamoDB error', async () => {
        mockSend.mockRejectedValueOnce(new Error('DynamoDB error'))
        const result = await handler(makeEvent('i1', { status: 'ACTIVE' })) as any
        expect(result.statusCode).toBe(500)
    })
})
