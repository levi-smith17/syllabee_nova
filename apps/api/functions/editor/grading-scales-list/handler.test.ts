import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from './handler'

const mockSend = vi.hoisted(() => vi.fn())

vi.mock('../../shared/db', () => ({
    dynamo: { send: mockSend },
    TABLE_NAME: 'test-table',
}))

vi.mock('../../shared/auth', () => ({
    getUserId: () => 'instructor-1',
}))

const makeEvent = () => ({
    requestContext: { authorizer: { jwt: { claims: { sub: 'instructor-1' } } } },
    pathParameters: {},
} as any)

describe('editor/grading-scales-list', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 200 with grading scales', async () => {
        mockSend.mockResolvedValueOnce({
            Items: [
                { pk: 'GRADESCALE#g1', sk: 'METADATA', id: 'g1', name: 'Standard' },
            ],
        })
        const result = await handler(makeEvent()) as any
        expect(result.statusCode).toBe(200)
        const { data } = JSON.parse(result.body)
        expect(data).toHaveLength(1)
        expect(data[0].name).toBe('Standard')
    })

    it('paginates through multiple pages', async () => {
        mockSend
            .mockResolvedValueOnce({ Items: [{ pk: 'GRADESCALE#g1', sk: 'METADATA', id: 'g1', name: 'Scale 1', ownerId: 'u1', createdAt: '' }], LastEvaluatedKey: { pk: 'k1' } })
            .mockResolvedValueOnce({ Items: [{ pk: 'GRADESCALE#g2', sk: 'METADATA', id: 'g2', name: 'Scale 2', ownerId: 'u1', createdAt: '' }] })
        const result = await handler(makeEvent()) as any
        expect(result.statusCode).toBe(200)
        const { data } = JSON.parse(result.body)
        expect(data).toHaveLength(2)
    })

    it('returns empty array when no scales exist', async () => {
        mockSend.mockResolvedValueOnce({ Items: [] })
        const result = await handler(makeEvent()) as any
        expect(result.statusCode).toBe(200)
        const { data } = JSON.parse(result.body)
        expect(data).toHaveLength(0)
    })

    it('returns 500 on DynamoDB error', async () => {
        mockSend.mockRejectedValueOnce(new Error('DDB error'))
        const result = await handler(makeEvent()) as any
        expect(result.statusCode).toBe(500)
    })
})
