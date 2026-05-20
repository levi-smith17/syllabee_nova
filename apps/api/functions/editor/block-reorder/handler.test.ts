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

const makeEvent = (id: string | undefined, segmentId: string | undefined, body: object) => ({
    requestContext: { authorizer: { jwt: { claims: { sub: 'instructor-1' } } } },
    body: JSON.stringify(body),
    pathParameters: { id, segmentId },
} as any)

const syllabusItem = { pk: 'SYLLABUS#s1', sk: 'METADATA', ownerId: 'instructor-1', locked: false }

describe('editor/block-reorder', () => {
    beforeEach(() => vi.resetAllMocks())

    it('returns 404 when missing ids', async () => {
        const result = await handler(makeEvent(undefined, 'seg1', { orderedIds: ['blk1'] })) as any
        expect(result.statusCode).toBe(404)
    })

    it('returns 400 when orderedIds is missing or empty', async () => {
        const result = await handler(makeEvent('s1', 'seg1', {})) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 409 when syllabus is locked', async () => {
        mockSend.mockResolvedValueOnce({ Item: { ...syllabusItem, locked: true } })
        const result = await handler(makeEvent('s1', 'seg1', { orderedIds: ['blk1'] })) as any
        expect(result.statusCode).toBe(409)
    })

    it('updates sortOrder for each block and returns 200', async () => {
        mockSend.mockResolvedValueOnce({ Item: syllabusItem })
        mockSend.mockResolvedValue({})
        const result = await handler(makeEvent('s1', 'seg1', { orderedIds: ['blk2', 'blk1'] })) as any
        expect(result.statusCode).toBe(200)
        expect(mockSend).toHaveBeenCalledTimes(3) // 1 get + 2 updates
        const update1 = mockSend.mock.calls[1][0]
        expect(update1.input.Key.sk).toBe('BLK#seg1#blk2')
        expect(update1.input.ExpressionAttributeValues[':order']).toBe(0)
    })

    it('returns 500 on DynamoDB error', async () => {
        mockSend.mockRejectedValueOnce(new Error('DDB error'))
        const result = await handler(makeEvent('s1', 'seg1', { orderedIds: ['blk1'] })) as any
        expect(result.statusCode).toBe(500)
    })
})
