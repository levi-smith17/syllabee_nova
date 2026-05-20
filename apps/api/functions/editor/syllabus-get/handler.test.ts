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

import { isAdmin } from '../../shared/auth'

const makeEvent = (id?: string) => ({
    requestContext: { authorizer: { jwt: { claims: { sub: 'instructor-1' } } } },
    pathParameters: id ? { id } : {},
} as any)

const metadataItem = {
    pk: 'SYLLABUS#s1', sk: 'METADATA', id: 's1',
    title: 'CIS-101', ownerId: 'instructor-1', locked: false,
}

describe('editor/syllabus-get', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 404 when no id in path', async () => {
        const result = await handler(makeEvent()) as any
        expect(result.statusCode).toBe(404)
    })

    it('returns 404 when syllabus does not exist', async () => {
        mockSend.mockResolvedValueOnce({ Items: [] })
        const result = await handler(makeEvent('s1')) as any
        expect(result.statusCode).toBe(404)
    })

    it('returns 403 when user is not owner and not admin', async () => {
        mockSend.mockResolvedValueOnce({ Items: [{ ...metadataItem, ownerId: 'other-user' }] })
        const result = await handler(makeEvent('s1')) as any
        expect(result.statusCode).toBe(403)
    })

    it('returns 200 with assembled syllabus detail for owner', async () => {
        mockSend.mockResolvedValueOnce({
            Items: [
                metadataItem,
                { pk: 'SYLLABUS#s1', sk: 'SEG#seg1', id: 'seg1', name: 'Policies', sortOrder: 0, isVisible: true, printHeading: false, printingOptional: false },
                { pk: 'SYLLABUS#s1', sk: 'BLK#seg1#blk1', id: 'blk1', type: 'content_block', name: 'Welcome', sortOrder: 0, isVisible: true, printHeading: false, content: { html: '<p>Hi</p>' }, published: false },
            ],
        })
        const result = await handler(makeEvent('s1')) as any
        expect(result.statusCode).toBe(200)
        const { data } = JSON.parse(result.body)
        expect(data.syllabus.id).toBe('s1')
        expect(data.segments).toHaveLength(1)
        expect(data.segments[0].blocks).toHaveLength(1)
        expect(data.segments[0].blocks[0].type).toBe('content_block')
    })

    it('allows admin to access any syllabus', async () => {
        ;(isAdmin as any).mockResolvedValue(true)
        mockSend.mockResolvedValueOnce({ Items: [{ ...metadataItem, ownerId: 'other-user' }] })
        const result = await handler(makeEvent('s1')) as any
        expect(result.statusCode).toBe(200)
    })

    it('returns 500 on DynamoDB error', async () => {
        mockSend.mockRejectedValueOnce(new Error('DDB error'))
        const result = await handler(makeEvent('s1')) as any
        expect(result.statusCode).toBe(500)
    })
})
