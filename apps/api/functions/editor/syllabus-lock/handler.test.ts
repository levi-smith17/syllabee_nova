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

const syllabusItem = { pk: 'SYLLABUS#s1', sk: 'METADATA', id: 's1', ownerId: 'instructor-1', locked: false }

describe('editor/syllabus-lock', () => {
    beforeEach(() => vi.resetAllMocks())

    it('returns 404 when no id in path', async () => {
        const result = await handler(makeEvent(undefined, { locked: true })) as any
        expect(result.statusCode).toBe(404)
    })

    it('returns 400 when locked is not a boolean', async () => {
        const result = await handler(makeEvent('s1', { locked: 'yes' })) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 404 when syllabus does not exist', async () => {
        mockSend.mockResolvedValueOnce({ Item: undefined })
        const result = await handler(makeEvent('s1', { locked: true })) as any
        expect(result.statusCode).toBe(404)
    })

    it('returns 403 when not owner and not admin', async () => {
        mockSend.mockResolvedValueOnce({ Item: { ...syllabusItem, ownerId: 'other' } })
        const result = await handler(makeEvent('s1', { locked: true })) as any
        expect(result.statusCode).toBe(403)
    })

    it('locks syllabus and returns 200', async () => {
        mockSend.mockResolvedValueOnce({ Item: syllabusItem })
        mockSend.mockResolvedValueOnce({})
        const result = await handler(makeEvent('s1', { locked: true })) as any
        expect(result.statusCode).toBe(200)
        const { data } = JSON.parse(result.body)
        expect(data.locked).toBe(true)
    })

    it('unlocks syllabus and returns 200', async () => {
        mockSend.mockResolvedValueOnce({ Item: { ...syllabusItem, locked: true } })
        mockSend.mockResolvedValueOnce({})
        const result = await handler(makeEvent('s1', { locked: false })) as any
        expect(result.statusCode).toBe(200)
        const { data } = JSON.parse(result.body)
        expect(data.locked).toBe(false)
    })

    it('allows admin to lock any syllabus', async () => {
        ;(isAdmin as any).mockResolvedValue(true)
        mockSend.mockResolvedValueOnce({ Item: { ...syllabusItem, ownerId: 'other' } })
        mockSend.mockResolvedValueOnce({})
        const result = await handler(makeEvent('s1', { locked: true })) as any
        expect(result.statusCode).toBe(200)
    })

    it('returns 500 on DynamoDB error', async () => {
        mockSend.mockRejectedValueOnce(new Error('DDB error'))
        const result = await handler(makeEvent('s1', { locked: true })) as any
        expect(result.statusCode).toBe(500)
    })
})
