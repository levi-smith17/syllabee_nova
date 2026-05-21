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

const makeEvent = (targetId: string | undefined, body: object) => ({
    requestContext: { authorizer: { jwt: { claims: { sub: 'instructor-1' } } } },
    body: JSON.stringify(body),
    pathParameters: targetId ? { id: targetId } : {},
} as any)

const targetSyllabus = { pk: 'SYLLABUS#t1', sk: 'METADATA', ownerId: 'instructor-1', locked: false }
const sourceSyllabus = { pk: 'SYLLABUS#s1', sk: 'METADATA', ownerId: 'instructor-1', locked: false }
const sourceSegment = {
    pk: 'SYLLABUS#s1', sk: 'SEG#seg-1',
    name: 'Introduction', description: 'Intro desc',
    printHeading: 2, printingOptional: false,
    isVisible: true, sections: ['sec-old-1'],
}

// mockSend call order for a standard copy (no blocks):
// 0: GetCommand (target syllabus)
// 1: GetCommand (source syllabus)
// 2: GetCommand (source segment)
// 3: QueryCommand (source blocks)
// 4: QueryCommand (existing target segs for sortOrder)
// 5: PutCommand (new segment)
function mockStandardCopy(sourceBlocks: object[] = [], existingSegOrders: object[] = []) {
    mockSend
        .mockResolvedValueOnce({ Item: targetSyllabus })
        .mockResolvedValueOnce({ Item: sourceSyllabus })
        .mockResolvedValueOnce({ Item: sourceSegment })
        .mockResolvedValueOnce({ Items: sourceBlocks })
        .mockResolvedValueOnce({ Items: existingSegOrders })
        .mockResolvedValueOnce({}) // PutCommand for new segment
}

describe('editor/segment-copy', () => {
    beforeEach(() => vi.resetAllMocks())

    it('returns 404 when no target syllabus id', async () => {
        const result = await handler(makeEvent(undefined, { sourceSyllabusId: 's1', sourceSegmentId: 'seg-1' })) as any
        expect(result.statusCode).toBe(404)
    })

    it('returns 400 when sourceSyllabusId or sourceSegmentId missing', async () => {
        const result = await handler(makeEvent('t1', { sourceSyllabusId: 's1' })) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 404 when target syllabus not found', async () => {
        mockSend.mockResolvedValueOnce({ Item: undefined })
        const result = await handler(makeEvent('t1', { sourceSyllabusId: 's1', sourceSegmentId: 'seg-1' })) as any
        expect(result.statusCode).toBe(404)
    })

    it('returns 409 when target syllabus is locked', async () => {
        mockSend.mockResolvedValueOnce({ Item: { ...targetSyllabus, locked: true } })
        const result = await handler(makeEvent('t1', { sourceSyllabusId: 's1', sourceSegmentId: 'seg-1' })) as any
        expect(result.statusCode).toBe(409)
    })

    it('copies segment with isVisible = false regardless of source', async () => {
        mockStandardCopy()
        const result = await handler(makeEvent('t1', { sourceSyllabusId: 's1', sourceSegmentId: 'seg-1' })) as any
        expect(result.statusCode).toBe(201)
        const putArg = mockSend.mock.calls[5][0]
        expect(putArg.input.Item.isVisible).toBe(false)
    })

    it('copies segment with sections from request body', async () => {
        mockStandardCopy()
        await handler(makeEvent('t1', { sourceSyllabusId: 's1', sourceSegmentId: 'seg-1', sections: ['sec-new-1'] }))
        const putArg = mockSend.mock.calls[5][0]
        expect(putArg.input.Item.sections).toEqual(['sec-new-1'])
    })

    it('copies segment with empty sections when not provided in body', async () => {
        mockStandardCopy()
        await handler(makeEvent('t1', { sourceSyllabusId: 's1', sourceSegmentId: 'seg-1' }))
        const putArg = mockSend.mock.calls[5][0]
        expect(putArg.input.Item.sections).toEqual([])
    })

    it('does NOT copy sections from source segment', async () => {
        mockStandardCopy()
        await handler(makeEvent('t1', { sourceSyllabusId: 's1', sourceSegmentId: 'seg-1' }))
        const putArg = mockSend.mock.calls[5][0]
        // source segment has sections: ['sec-old-1'] — copied segment should NOT have those
        expect(putArg.input.Item.sections).not.toContain('sec-old-1')
    })

    it('returns 201 with new segment id', async () => {
        mockStandardCopy()
        const result = await handler(makeEvent('t1', { sourceSyllabusId: 's1', sourceSegmentId: 'seg-1' })) as any
        expect(result.statusCode).toBe(201)
        const body = JSON.parse(result.body)
        expect(body.data.id).toBeDefined()
    })

    it('returns 500 on DynamoDB error', async () => {
        mockSend.mockRejectedValueOnce(new Error('DDB error'))
        const result = await handler(makeEvent('t1', { sourceSyllabusId: 's1', sourceSegmentId: 'seg-1' })) as any
        expect(result.statusCode).toBe(500)
    })
})
