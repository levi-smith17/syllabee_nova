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

const metaItem = { pk: 'GRADESCALE#g1', sk: 'METADATA', ownerId: 'instructor-1' }
const gradeItem = { pk: 'GRADESCALE#g1', sk: 'GRADE#grade1' }

describe('editor/grading-scale-delete', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 404 when no id', async () => {
        const result = await handler(makeEvent()) as any
        expect(result.statusCode).toBe(404)
    })

    it('returns 404 when scale does not exist', async () => {
        mockSend.mockResolvedValueOnce({ Items: [] })
        const result = await handler(makeEvent('g1')) as any
        expect(result.statusCode).toBe(404)
    })

    it('returns 403 when not owner and not admin', async () => {
        mockSend.mockResolvedValueOnce({ Items: [{ ...metaItem, ownerId: 'other' }] })
        const result = await handler(makeEvent('g1')) as any
        expect(result.statusCode).toBe(403)
    })

    it('deletes scale and all grade items and returns 204', async () => {
        mockSend.mockResolvedValueOnce({ Items: [metaItem, gradeItem] })
        mockSend.mockResolvedValue({})
        const result = await handler(makeEvent('g1')) as any
        expect(result.statusCode).toBe(204)
        expect(mockSend).toHaveBeenCalledTimes(3) // 1 query + 2 deletes
    })

    it('allows admin to delete any scale', async () => {
        ;(isAdmin as any).mockResolvedValue(true)
        mockSend.mockResolvedValueOnce({ Items: [{ ...metaItem, ownerId: 'other' }] })
        mockSend.mockResolvedValue({})
        const result = await handler(makeEvent('g1')) as any
        expect(result.statusCode).toBe(204)
    })

    it('returns 500 on DynamoDB error', async () => {
        mockSend.mockRejectedValueOnce(new Error('DDB error'))
        const result = await handler(makeEvent('g1')) as any
        expect(result.statusCode).toBe(500)
    })
})
