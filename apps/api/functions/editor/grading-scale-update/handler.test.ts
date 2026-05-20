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

const makeEvent = (id: string | undefined, body: object) => ({
    requestContext: { authorizer: { jwt: { claims: { sub: 'instructor-1' } } } },
    body: JSON.stringify(body),
    pathParameters: id ? { id } : {},
} as any)

const scaleItem = { pk: 'GRADESCALE#g1', sk: 'METADATA', id: 'g1', name: 'Old Name', ownerId: 'instructor-1' }
const validGrades = [{ letter: 'A', minPercent: 90, maxPercent: 100 }]

describe('editor/grading-scale-update', () => {
    beforeEach(() => vi.resetAllMocks())

    it('returns 404 when no id', async () => {
        const result = await handler(makeEvent(undefined, { name: 'x' })) as any
        expect(result.statusCode).toBe(404)
    })

    it('returns 400 when neither name nor grades provided', async () => {
        const result = await handler(makeEvent('g1', {})) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 404 when scale does not exist', async () => {
        mockSend.mockResolvedValueOnce({ Item: undefined })
        const result = await handler(makeEvent('g1', { name: 'New' })) as any
        expect(result.statusCode).toBe(404)
    })

    it('returns 403 when not owner and not admin', async () => {
        mockSend.mockResolvedValueOnce({ Item: { ...scaleItem, ownerId: 'other' } })
        const result = await handler(makeEvent('g1', { name: 'New' })) as any
        expect(result.statusCode).toBe(403)
    })

    it('updates name only and returns 200', async () => {
        mockSend.mockResolvedValueOnce({ Item: scaleItem })
        mockSend.mockResolvedValueOnce({})
        const result = await handler(makeEvent('g1', { name: 'New Name' })) as any
        expect(result.statusCode).toBe(200)
        expect(mockSend).toHaveBeenCalledTimes(2)
    })

    it('replaces grades and returns 200', async () => {
        mockSend.mockResolvedValueOnce({ Item: scaleItem })
        // get + query existing grades (1 existing grade) + delete + put
        mockSend.mockResolvedValueOnce({ Items: [{ pk: 'GRADESCALE#g1', sk: 'GRADE#old' }] })
        mockSend.mockResolvedValue({})
        const result = await handler(makeEvent('g1', { grades: validGrades })) as any
        expect(result.statusCode).toBe(200)
    })

    it('allows admin to update any scale', async () => {
        ;(isAdmin as any).mockResolvedValue(true)
        mockSend.mockResolvedValueOnce({ Item: { ...scaleItem, ownerId: 'other' } })
        mockSend.mockResolvedValueOnce({})
        const result = await handler(makeEvent('g1', { name: 'Admin Update' })) as any
        expect(result.statusCode).toBe(200)
    })

    it('returns 500 on DynamoDB error', async () => {
        mockSend.mockRejectedValueOnce(new Error('DDB error'))
        const result = await handler(makeEvent('g1', { name: 'x' })) as any
        expect(result.statusCode).toBe(500)
    })
})
