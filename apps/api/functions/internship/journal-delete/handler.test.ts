import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from './handler'

const mockSend = vi.hoisted(() => vi.fn())

vi.mock('../../shared/db', () => ({
    dynamo: { send: mockSend },
    TABLE_NAME: 'test-table',
}))

const makeEvent = (params: { id?: string; entryId?: string }) => ({
    requestContext: { authorizer: { jwt: { claims: { sub: 'instructor-1' } } } },
    body: null,
    pathParameters: params,
} as any)

describe('internship/journal-delete', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 400 when path params are missing', async () => {
        const result = await handler(makeEvent({})) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 404 when journal entry not found', async () => {
        mockSend.mockResolvedValueOnce({ Item: null })
        const result = await handler(makeEvent({ id: 'i1', entryId: 'j1' })) as any
        expect(result.statusCode).toBe(404)
    })

    it('deletes entry and recalculates completedHours, returns 204', async () => {
        mockSend
            .mockResolvedValueOnce({ Item: { pk: 'INTERNSHIP#i1', sk: 'JOURNAL#j1', totalMinutes: 120 } })
            .mockResolvedValueOnce({}) // DeleteCommand
            .mockResolvedValueOnce({ Items: [{ totalMinutes: 60 }, { totalMinutes: 90 }] }) // remaining
            .mockResolvedValueOnce({}) // UpdateCommand
        const result = await handler(makeEvent({ id: 'i1', entryId: 'j1' })) as any
        expect(result.statusCode).toBe(204)
        const updateArg = mockSend.mock.calls[3][0]
        expect(updateArg.input.ExpressionAttributeValues[':hours']).toBeCloseTo(2.5)
    })

    it('sets completedHours to 0 when no entries remain', async () => {
        mockSend
            .mockResolvedValueOnce({ Item: { pk: 'INTERNSHIP#i1', sk: 'JOURNAL#j1', totalMinutes: 60 } })
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({ Items: [] })
            .mockResolvedValueOnce({})
        await handler(makeEvent({ id: 'i1', entryId: 'j1' }))
        const updateArg = mockSend.mock.calls[3][0]
        expect(updateArg.input.ExpressionAttributeValues[':hours']).toBe(0)
    })

    it('returns 500 on DynamoDB error', async () => {
        mockSend.mockRejectedValueOnce(new Error('DynamoDB error'))
        const result = await handler(makeEvent({ id: 'i1', entryId: 'j1' })) as any
        expect(result.statusCode).toBe(500)
    })
})
