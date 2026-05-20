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

describe('internship/journal-verify', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 400 when internshipId is missing', async () => {
        const result = await handler(makeEvent(undefined, { entryIds: ['j1'], verified: true })) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 400 when entryIds is not an array or is empty', async () => {
        const r1 = await handler(makeEvent('i1', { entryIds: [], verified: true })) as any
        expect(r1.statusCode).toBe(400)
        const r2 = await handler(makeEvent('i1', { entryIds: 'j1', verified: true })) as any
        expect(r2.statusCode).toBe(400)
    })

    it('returns 400 when verified is not a boolean', async () => {
        const result = await handler(makeEvent('i1', { entryIds: ['j1'], verified: 'yes' })) as any
        expect(result.statusCode).toBe(400)
    })

    it('verifies entries and returns 200 with updated count', async () => {
        mockSend.mockResolvedValue({})
        const result = await handler(makeEvent('i1', { entryIds: ['j1', 'j2', 'j3'], verified: true })) as any
        expect(result.statusCode).toBe(200)
        const { data } = JSON.parse(result.body)
        expect(data.updated).toBe(3)
        expect(mockSend).toHaveBeenCalledTimes(3)
    })

    it('can unverify entries', async () => {
        mockSend.mockResolvedValue({})
        const result = await handler(makeEvent('i1', { entryIds: ['j1'], verified: false })) as any
        expect(result.statusCode).toBe(200)
        const updateArg = mockSend.mock.calls[0][0]
        expect(updateArg.input.ExpressionAttributeValues[':verified']).toBe(false)
    })

    it('returns 500 on DynamoDB error', async () => {
        mockSend.mockRejectedValueOnce(new Error('DynamoDB error'))
        const result = await handler(makeEvent('i1', { entryIds: ['j1'], verified: true })) as any
        expect(result.statusCode).toBe(500)
    })
})
