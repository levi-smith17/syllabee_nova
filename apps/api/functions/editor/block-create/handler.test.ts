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
const segItem = { pk: 'SYLLABUS#s1', sk: 'SEG#seg1', id: 'seg1' }

describe('editor/block-create', () => {
    beforeEach(() => vi.resetAllMocks())

    it('returns 404 when missing ids', async () => {
        const result = await handler(makeEvent(undefined, 'seg1', { type: 'content_block', name: 'x' })) as any
        expect(result.statusCode).toBe(404)
    })

    it('returns 400 when type is invalid', async () => {
        const result = await handler(makeEvent('s1', 'seg1', { type: 'course_syllabus_block', name: 'x' })) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 400 when name is missing', async () => {
        const result = await handler(makeEvent('s1', 'seg1', { type: 'content_block' })) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 404 when syllabus does not exist', async () => {
        mockSend.mockResolvedValueOnce({ Item: undefined })
        const result = await handler(makeEvent('s1', 'seg1', { type: 'content_block', name: 'Welcome' })) as any
        expect(result.statusCode).toBe(404)
    })

    it('returns 409 when syllabus is locked', async () => {
        mockSend.mockResolvedValueOnce({ Item: { ...syllabusItem, locked: true } })
        const result = await handler(makeEvent('s1', 'seg1', { type: 'content_block', name: 'Welcome' })) as any
        expect(result.statusCode).toBe(409)
    })

    it('returns 404 when segment does not exist', async () => {
        mockSend.mockResolvedValueOnce({ Item: syllabusItem })
        mockSend.mockResolvedValueOnce({ Item: undefined })
        const result = await handler(makeEvent('s1', 'seg1', { type: 'content_block', name: 'Welcome' })) as any
        expect(result.statusCode).toBe(404)
    })

    it('creates block with sortOrder = 0 for first block', async () => {
        mockSend.mockResolvedValueOnce({ Item: syllabusItem })
        mockSend.mockResolvedValueOnce({ Item: segItem })
        mockSend.mockResolvedValueOnce({ Items: [] })
        mockSend.mockResolvedValueOnce({})

        const result = await handler(makeEvent('s1', 'seg1', { type: 'content_block', name: 'Welcome' })) as any
        expect(result.statusCode).toBe(201)
        const putArg = mockSend.mock.calls[3][0]
        expect(putArg.input.Item.sortOrder).toBe(0)
        expect(putArg.input.Item.sk).toMatch(/^BLK#seg1#/)
        expect(putArg.input.Item.type).toBe('content_block')
    })

    it('returns 500 on DynamoDB error', async () => {
        mockSend.mockRejectedValueOnce(new Error('DDB error'))
        const result = await handler(makeEvent('s1', 'seg1', { type: 'content_block', name: 'Welcome' })) as any
        expect(result.statusCode).toBe(500)
    })
})
