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

const makeEvent = (id: string | undefined, body: object) => ({
    requestContext: { authorizer: { jwt: { claims: { sub: 'instructor-1' } } } },
    body: JSON.stringify(body),
    pathParameters: id ? { id } : {},
} as any)

const syllabusItem = { pk: 'SYLLABUS#s1', sk: 'METADATA', ownerId: 'instructor-1', locked: false }

describe('editor/segment-create', () => {
    beforeEach(() => vi.resetAllMocks())

    it('returns 404 when no syllabus id', async () => {
        const result = await handler(makeEvent(undefined, { name: 'Policies' })) as any
        expect(result.statusCode).toBe(404)
    })

    it('returns 400 when name is missing', async () => {
        const result = await handler(makeEvent('s1', {})) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 404 when syllabus does not exist', async () => {
        mockSend.mockResolvedValueOnce({ Item: undefined })
        const result = await handler(makeEvent('s1', { name: 'Policies' })) as any
        expect(result.statusCode).toBe(404)
    })

    it('returns 409 when syllabus is locked', async () => {
        mockSend.mockResolvedValueOnce({ Item: { ...syllabusItem, locked: true } })
        const result = await handler(makeEvent('s1', { name: 'Policies' })) as any
        expect(result.statusCode).toBe(409)
    })

    it('creates segment with sortOrder = 0 for first segment', async () => {
        mockSend.mockResolvedValueOnce({ Item: syllabusItem })
        mockSend.mockResolvedValueOnce({ Items: [] })
        mockSend.mockResolvedValueOnce({})

        const result = await handler(makeEvent('s1', { name: 'Policies' })) as any
        expect(result.statusCode).toBe(201)
        const putArg = mockSend.mock.calls[2][0]
        expect(putArg.input.Item.sortOrder).toBe(0)
        expect(putArg.input.Item.name).toBe('Policies')
        expect(putArg.input.Item.sk).toMatch(/^SEG#/)
    })

    it('creates segment with sortOrder = max + 1', async () => {
        mockSend.mockResolvedValueOnce({ Item: syllabusItem })
        mockSend.mockResolvedValueOnce({ Items: [{ sortOrder: 2 }, { sortOrder: 0 }] })
        mockSend.mockResolvedValueOnce({})

        const result = await handler(makeEvent('s1', { name: 'Grading' })) as any
        expect(result.statusCode).toBe(201)
        const putArg = mockSend.mock.calls[2][0]
        expect(putArg.input.Item.sortOrder).toBe(3)
    })

    it('defaults isVisible to false', async () => {
        mockSend.mockResolvedValueOnce({ Item: syllabusItem })
        mockSend.mockResolvedValueOnce({ Items: [] })
        mockSend.mockResolvedValueOnce({})

        await handler(makeEvent('s1', { name: 'Policies' }))
        const putArg = mockSend.mock.calls[2][0]
        expect(putArg.input.Item.isVisible).toBe(false)
    })

    it('stores sections when provided', async () => {
        mockSend.mockResolvedValueOnce({ Item: syllabusItem })
        mockSend.mockResolvedValueOnce({ Items: [] })
        mockSend.mockResolvedValueOnce({})

        await handler(makeEvent('s1', { name: 'Policies', sections: ['sec-1', 'sec-2'] }))
        const putArg = mockSend.mock.calls[2][0]
        expect(putArg.input.Item.sections).toEqual(['sec-1', 'sec-2'])
    })

    it('stores empty sections array when not provided', async () => {
        mockSend.mockResolvedValueOnce({ Item: syllabusItem })
        mockSend.mockResolvedValueOnce({ Items: [] })
        mockSend.mockResolvedValueOnce({})

        await handler(makeEvent('s1', { name: 'Policies' }))
        const putArg = mockSend.mock.calls[2][0]
        expect(putArg.input.Item.sections).toEqual([])
    })

    it('returns 500 on DynamoDB error', async () => {
        mockSend.mockRejectedValueOnce(new Error('DDB error'))
        const result = await handler(makeEvent('s1', { name: 'Policies' })) as any
        expect(result.statusCode).toBe(500)
    })
})
