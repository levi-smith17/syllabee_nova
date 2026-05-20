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

const makeEvent = (id: string | undefined, segmentId: string | undefined, blockId: string | undefined, body: object) => ({
    requestContext: { authorizer: { jwt: { claims: { sub: 'instructor-1' } } } },
    body: JSON.stringify(body),
    pathParameters: { id, segmentId, blockId },
} as any)

const syllabusItem = { pk: 'SYLLABUS#s1', sk: 'METADATA', ownerId: 'instructor-1', locked: false }

describe('editor/block-update', () => {
    beforeEach(() => vi.resetAllMocks())

    it('returns 404 when missing path params', async () => {
        const result = await handler(makeEvent(undefined, 'seg1', 'blk1', { name: 'x' })) as any
        expect(result.statusCode).toBe(404)
    })

    it('returns 404 when syllabus does not exist', async () => {
        mockSend.mockResolvedValueOnce({ Item: undefined })
        const result = await handler(makeEvent('s1', 'seg1', 'blk1', { name: 'x' })) as any
        expect(result.statusCode).toBe(404)
    })

    it('returns 409 when syllabus is locked', async () => {
        mockSend.mockResolvedValueOnce({ Item: { ...syllabusItem, locked: true } })
        const result = await handler(makeEvent('s1', 'seg1', 'blk1', { name: 'x' })) as any
        expect(result.statusCode).toBe(409)
    })

    it('returns 400 when no updatable fields', async () => {
        mockSend.mockResolvedValueOnce({ Item: syllabusItem })
        const result = await handler(makeEvent('s1', 'seg1', 'blk1', { unknownField: 'x' })) as any
        expect(result.statusCode).toBe(400)
    })

    it('updates block and returns 200', async () => {
        mockSend.mockResolvedValueOnce({ Item: syllabusItem })
        mockSend.mockResolvedValueOnce({})
        const result = await handler(makeEvent('s1', 'seg1', 'blk1', { name: 'Updated', content: { html: '<p>New</p>' } })) as any
        expect(result.statusCode).toBe(200)
        const updateArg = mockSend.mock.calls[1][0]
        expect(updateArg.input.Key).toEqual({ pk: 'SYLLABUS#s1', sk: 'BLK#seg1#blk1' })
    })

    it('returns 500 on DynamoDB error', async () => {
        mockSend.mockRejectedValueOnce(new Error('DDB error'))
        const result = await handler(makeEvent('s1', 'seg1', 'blk1', { name: 'x' })) as any
        expect(result.statusCode).toBe(500)
    })
})
