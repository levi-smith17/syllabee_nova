import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from './handler'

const mockSend = vi.hoisted(() => vi.fn())

vi.mock('../../shared/db', () => ({
    dynamo: { send: mockSend },
    TABLE_NAME: 'test-table',
}))

const makeEvent = (params: { id?: string; locationId?: string }) => ({
    requestContext: { authorizer: { jwt: { claims: { sub: 'instructor-1' } } } },
    body: null,
    pathParameters: params,
} as any)

describe('internship/location-delete', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 400 when path params are missing', async () => {
        const result = await handler(makeEvent({})) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 404 when location not found', async () => {
        mockSend.mockResolvedValueOnce({ Item: null })
        const result = await handler(makeEvent({ id: 'i1', locationId: 'loc1' })) as any
        expect(result.statusCode).toBe(404)
    })

    it('returns 409 when location has journal entries', async () => {
        mockSend
            .mockResolvedValueOnce({ Item: { pk: 'INTERNSHIP#i1', sk: 'LOCATION#loc1' } })
            .mockResolvedValueOnce({ Items: [{ sk: 'JOURNAL#j1', locationId: 'loc1' }] })
        const result = await handler(makeEvent({ id: 'i1', locationId: 'loc1' })) as any
        expect(result.statusCode).toBe(409)
    })

    it('deletes location and returns 204', async () => {
        mockSend
            .mockResolvedValueOnce({ Item: { pk: 'INTERNSHIP#i1', sk: 'LOCATION#loc1' } })
            .mockResolvedValueOnce({ Items: [] })
            .mockResolvedValueOnce({})
        const result = await handler(makeEvent({ id: 'i1', locationId: 'loc1' })) as any
        expect(result.statusCode).toBe(204)
    })

    it('returns 500 on DynamoDB error', async () => {
        mockSend.mockRejectedValueOnce(new Error('DynamoDB error'))
        const result = await handler(makeEvent({ id: 'i1', locationId: 'loc1' })) as any
        expect(result.statusCode).toBe(500)
    })
})
