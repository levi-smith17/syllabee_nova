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

const makeEvent = (id: string | undefined, segmentId: string | undefined, blockId: string | undefined) => ({
    requestContext: { authorizer: { jwt: { claims: { sub: 'instructor-1' } } } },
    pathParameters: { id, segmentId, blockId },
} as any)

const syllabusItem = { pk: 'SYLLABUS#s1', sk: 'METADATA', ownerId: 'instructor-1', locked: false }
const blockItem = { pk: 'SYLLABUS#s1', sk: 'BLK#seg1#blk1', id: 'blk1' }

describe('editor/block-delete', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 404 when missing path params', async () => {
        const result = await handler(makeEvent(undefined, 'seg1', 'blk1')) as any
        expect(result.statusCode).toBe(404)
    })

    it('returns 404 when syllabus does not exist', async () => {
        mockSend.mockResolvedValueOnce({ Item: undefined })
        const result = await handler(makeEvent('s1', 'seg1', 'blk1')) as any
        expect(result.statusCode).toBe(404)
    })

    it('returns 409 when syllabus is locked', async () => {
        mockSend.mockResolvedValueOnce({ Item: { ...syllabusItem, locked: true } })
        const result = await handler(makeEvent('s1', 'seg1', 'blk1')) as any
        expect(result.statusCode).toBe(409)
    })

    it('returns 404 when block does not exist', async () => {
        mockSend.mockResolvedValueOnce({ Item: syllabusItem })
        mockSend.mockResolvedValueOnce({ Item: undefined })
        const result = await handler(makeEvent('s1', 'seg1', 'blk1')) as any
        expect(result.statusCode).toBe(404)
    })

    it('deletes block and returns 204', async () => {
        mockSend.mockResolvedValueOnce({ Item: syllabusItem })
        mockSend.mockResolvedValueOnce({ Item: blockItem })
        mockSend.mockResolvedValueOnce({})
        const result = await handler(makeEvent('s1', 'seg1', 'blk1')) as any
        expect(result.statusCode).toBe(204)
        const deleteArg = mockSend.mock.calls[2][0]
        expect(deleteArg.input.Key).toEqual({ pk: 'SYLLABUS#s1', sk: 'BLK#seg1#blk1' })
    })

    it('returns 500 on DynamoDB error', async () => {
        mockSend.mockRejectedValueOnce(new Error('DDB error'))
        const result = await handler(makeEvent('s1', 'seg1', 'blk1')) as any
        expect(result.statusCode).toBe(500)
    })
})
