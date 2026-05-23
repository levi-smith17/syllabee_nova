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
    clearMasterSyllabusForSyllabus: vi.fn(async () => {}),
}))

import { isAdmin } from '../../shared/auth'

const makeEvent = (id?: string) => ({
    requestContext: { authorizer: { jwt: { claims: { sub: 'instructor-1' } } } },
    pathParameters: id ? { id } : {},
} as any)

const metaItem = { pk: 'SYLLABUS#s1', sk: 'METADATA', ownerId: 'instructor-1', locked: false }
const segItem = { pk: 'SYLLABUS#s1', sk: 'SEG#seg1' }
const blkItem = { pk: 'SYLLABUS#s1', sk: 'BLK#seg1#blk1' }

describe('editor/syllabus-delete', () => {
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

    it('returns 403 when not owner and not admin', async () => {
        mockSend.mockResolvedValueOnce({ Items: [{ ...metaItem, ownerId: 'other' }] })
        const result = await handler(makeEvent('s1')) as any
        expect(result.statusCode).toBe(403)
    })

    it('returns 409 when syllabus is locked', async () => {
        mockSend.mockResolvedValueOnce({ Items: [{ ...metaItem, locked: true }] })
        const result = await handler(makeEvent('s1')) as any
        expect(result.statusCode).toBe(409)
    })

    it('deletes all partition items and returns 204', async () => {
        mockSend.mockResolvedValueOnce({ Items: [metaItem, segItem, blkItem] })
        mockSend.mockResolvedValue({})
        const result = await handler(makeEvent('s1')) as any
        expect(result.statusCode).toBe(204)
        expect(mockSend).toHaveBeenCalledTimes(4) // 1 query + 3 deletes
    })

    it('allows admin to delete any syllabus', async () => {
        ;(isAdmin as any).mockResolvedValue(true)
        mockSend.mockResolvedValueOnce({ Items: [{ ...metaItem, ownerId: 'other' }] })
        mockSend.mockResolvedValue({})
        const result = await handler(makeEvent('s1')) as any
        expect(result.statusCode).toBe(204)
    })

    it('returns 500 on DynamoDB error', async () => {
        mockSend.mockRejectedValueOnce(new Error('DDB error'))
        const result = await handler(makeEvent('s1')) as any
        expect(result.statusCode).toBe(500)
    })
})
