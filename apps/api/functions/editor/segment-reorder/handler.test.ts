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

const makeEvent = (id: string | undefined, body: object) => ({
    requestContext: { authorizer: { jwt: { claims: { sub: 'instructor-1' } } } },
    body: JSON.stringify(body),
    pathParameters: id ? { id } : {},
} as any)

const syllabusItem = { pk: 'SYLLABUS#s1', sk: 'METADATA', ownerId: 'instructor-1', locked: false }

describe('editor/segment-reorder', () => {
    beforeEach(() => vi.resetAllMocks())

    it('returns 404 when no syllabus id', async () => {
        const result = await handler(makeEvent(undefined, { orderedIds: ['a'] })) as any
        expect(result.statusCode).toBe(404)
    })

    it('returns 400 when orderedIds is missing or empty', async () => {
        const result = await handler(makeEvent('s1', {})) as any
        expect(result.statusCode).toBe(400)
        const result2 = await handler(makeEvent('s1', { orderedIds: [] })) as any
        expect(result2.statusCode).toBe(400)
    })

    it('returns 409 when syllabus is locked', async () => {
        mockSend.mockResolvedValueOnce({ Item: { ...syllabusItem, locked: true } })
        const result = await handler(makeEvent('s1', { orderedIds: ['seg1'] })) as any
        expect(result.statusCode).toBe(409)
    })

    it('updates sortOrder for each segment and returns 200', async () => {
        mockSend.mockResolvedValueOnce({ Item: syllabusItem })
        mockSend.mockResolvedValue({})
        const result = await handler(makeEvent('s1', { orderedIds: ['seg2', 'seg1', 'seg3'] })) as any
        expect(result.statusCode).toBe(200)
        // 1 get + 3 updates
        expect(mockSend).toHaveBeenCalledTimes(4)
        const update1 = mockSend.mock.calls[1][0]
        expect(update1.input.Key.sk).toBe('SEG#seg2')
        expect(update1.input.ExpressionAttributeValues[':order']).toBe(0)
        const update3 = mockSend.mock.calls[3][0]
        expect(update3.input.Key.sk).toBe('SEG#seg3')
        expect(update3.input.ExpressionAttributeValues[':order']).toBe(2)
    })

    it('returns 500 on DynamoDB error', async () => {
        mockSend.mockRejectedValueOnce(new Error('DDB error'))
        const result = await handler(makeEvent('s1', { orderedIds: ['seg1'] })) as any
        expect(result.statusCode).toBe(500)
    })
})
