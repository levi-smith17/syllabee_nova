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
    syncAfterSegmentSectionsChange: vi.fn(async () => {}),
}))

const makeEvent = (id: string | undefined, segmentId: string | undefined, body: object) => ({
    requestContext: { authorizer: { jwt: { claims: { sub: 'instructor-1' } } } },
    body: JSON.stringify(body),
    pathParameters: { id, segmentId },
} as any)

const syllabusItem = { pk: 'SYLLABUS#s1', sk: 'METADATA', ownerId: 'instructor-1', locked: false }

describe('editor/segment-update', () => {
    beforeEach(() => vi.resetAllMocks())

    it('returns 404 when missing id or segmentId', async () => {
        const result = await handler(makeEvent(undefined, 'seg1', { name: 'x' })) as any
        expect(result.statusCode).toBe(404)
    })

    it('returns 404 when syllabus does not exist', async () => {
        mockSend.mockResolvedValueOnce({ Item: undefined })
        const result = await handler(makeEvent('s1', 'seg1', { name: 'x' })) as any
        expect(result.statusCode).toBe(404)
    })

    it('returns 409 when syllabus is locked', async () => {
        mockSend.mockResolvedValueOnce({ Item: { ...syllabusItem, locked: true } })
        const result = await handler(makeEvent('s1', 'seg1', { name: 'x' })) as any
        expect(result.statusCode).toBe(409)
    })

    it('returns 400 when no updatable fields', async () => {
        mockSend.mockResolvedValueOnce({ Item: syllabusItem })
        const result = await handler(makeEvent('s1', 'seg1', { unknownField: true })) as any
        expect(result.statusCode).toBe(400)
    })

    it('updates segment and returns 200', async () => {
        mockSend
            .mockResolvedValueOnce({ Item: syllabusItem })
            .mockResolvedValueOnce({})
        const result = await handler(makeEvent('s1', 'seg1', { name: 'Updated', isVisible: false })) as any
        expect(result.statusCode).toBe(200)
        const updateArg = mockSend.mock.calls[1][0]
        expect(updateArg.input.Key).toEqual({ pk: 'SYLLABUS#s1', sk: 'SEG#seg1' })
    })

    it('updates sections field', async () => {
        mockSend
            .mockResolvedValueOnce({ Item: syllabusItem })
            .mockResolvedValueOnce({ Item: { sections: [] } })
            .mockResolvedValueOnce({})
        const result = await handler(makeEvent('s1', 'seg1', { sections: ['sec-1', 'sec-2'] })) as any
        expect(result.statusCode).toBe(200)
        const updateArg = mockSend.mock.calls[2][0]
        expect(updateArg.input.ExpressionAttributeValues[':sections']).toEqual(['sec-1', 'sec-2'])
    })

    it('updates sections to empty array (removes all)', async () => {
        mockSend
            .mockResolvedValueOnce({ Item: syllabusItem })
            .mockResolvedValueOnce({ Item: { sections: ['sec-1'] } })
            .mockResolvedValueOnce({})
        const result = await handler(makeEvent('s1', 'seg1', { sections: [] })) as any
        expect(result.statusCode).toBe(200)
        const updateArg = mockSend.mock.calls[2][0]
        expect(updateArg.input.ExpressionAttributeValues[':sections']).toEqual([])
    })

    it('returns 500 on DynamoDB error', async () => {
        mockSend.mockRejectedValueOnce(new Error('DDB error'))
        const result = await handler(makeEvent('s1', 'seg1', { name: 'x' })) as any
        expect(result.statusCode).toBe(500)
    })
})
