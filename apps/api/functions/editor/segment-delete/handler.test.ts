import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from './handler'

const mockSend = vi.hoisted(() => vi.fn())

vi.mock('../../shared/db', () => ({
    dynamo: { send: mockSend },
    TABLE_NAME: 'test-table',
}))

vi.mock('../../shared/auth', () => ({
    getUserId: vi.fn(() => 'instructor-1'),
    isAdmin: vi.fn(async () => false),
    getPathId: (event: any) => event.pathParameters?.id,
}))

vi.mock('../../shared/sync-section-syllabus', () => ({
    MasterSyllabusConflictError: class MasterSyllabusConflictError extends Error {},
    syncAfterSegmentDelete: vi.fn(async () => {}),
}))

const makeEvent = (id: string | undefined, segmentId: string | undefined) => ({
    requestContext: { authorizer: { jwt: { claims: { sub: 'instructor-1' } } } },
    pathParameters: { id, segmentId },
} as any)

const syllabusItem = { pk: 'SYLLABUS#s1', sk: 'METADATA', ownerId: 'instructor-1', locked: false }

describe('editor/segment-delete', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 404 when missing id or segmentId', async () => {
        const result = await handler(makeEvent(undefined, 'seg1')) as any
        expect(result.statusCode).toBe(404)
    })

    it('returns 404 when syllabus does not exist', async () => {
        mockSend.mockResolvedValueOnce({ Item: undefined })
        const result = await handler(makeEvent('s1', 'seg1')) as any
        expect(result.statusCode).toBe(404)
    })

    it('returns 409 when syllabus is locked', async () => {
        mockSend.mockResolvedValueOnce({ Item: { ...syllabusItem, locked: true } })
        const result = await handler(makeEvent('s1', 'seg1')) as any
        expect(result.statusCode).toBe(409)
    })

    it('deletes segment and associated blocks and returns 204', async () => {
        mockSend
            .mockResolvedValueOnce({ Item: syllabusItem })
            .mockResolvedValueOnce({ Item: { sections: ['sec-1'] } })
            .mockResolvedValueOnce({ Items: [{ pk: 'SYLLABUS#s1', sk: 'BLK#seg1#blk1' }] })
        mockSend.mockResolvedValue({})

        const result = await handler(makeEvent('s1', 'seg1')) as any
        expect(result.statusCode).toBe(204)
        // syllabus get + segment get + block query + 2 deletes
        expect(mockSend).toHaveBeenCalledTimes(5)
    })

    it('deletes segment with no blocks and returns 204', async () => {
        mockSend
            .mockResolvedValueOnce({ Item: syllabusItem })
            .mockResolvedValueOnce({ Item: { sections: [] } })
            .mockResolvedValueOnce({ Items: [] })
        mockSend.mockResolvedValueOnce({})

        const result = await handler(makeEvent('s1', 'seg1')) as any
        expect(result.statusCode).toBe(204)
        expect(mockSend).toHaveBeenCalledTimes(4)
    })

    it('returns 500 on DynamoDB error', async () => {
        mockSend.mockRejectedValueOnce(new Error('DDB error'))
        const result = await handler(makeEvent('s1', 'seg1')) as any
        expect(result.statusCode).toBe(500)
    })
})
