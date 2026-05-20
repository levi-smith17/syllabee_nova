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
}))

import { isAdmin } from '../../shared/auth'

const makeEvent = () => ({
    requestContext: { authorizer: { jwt: { claims: { sub: 'instructor-1' } } } },
    pathParameters: {},
} as any)

describe('editor/syllabi-list', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 200 with syllabi for instructor (filtered by ownerId)', async () => {
        mockSend.mockResolvedValueOnce({ Items: [{ id: 's1', title: 'Test' }] })

        const result = await handler(makeEvent()) as any
        expect(result.statusCode).toBe(200)
        const { data } = JSON.parse(result.body)
        expect(data).toHaveLength(1)
        const scanArg = mockSend.mock.calls[0][0]
        expect(scanArg.input.FilterExpression).toContain('ownerId')
    })

    it('returns all syllabi for admin (no ownerId filter)', async () => {
        ;(isAdmin as any).mockResolvedValue(true)
        mockSend.mockResolvedValueOnce({ Items: [{ id: 's1' }, { id: 's2' }] })

        const result = await handler(makeEvent()) as any
        expect(result.statusCode).toBe(200)
        const { data } = JSON.parse(result.body)
        expect(data).toHaveLength(2)
        const scanArg = mockSend.mock.calls[0][0]
        expect(scanArg.input.FilterExpression).not.toContain('ownerId')
    })

    it('paginates through multiple pages', async () => {
        mockSend
            .mockResolvedValueOnce({ Items: [{ id: 's1' }], LastEvaluatedKey: { pk: 'k1' } })
            .mockResolvedValueOnce({ Items: [{ id: 's2' }] })

        const result = await handler(makeEvent()) as any
        expect(result.statusCode).toBe(200)
        const { data } = JSON.parse(result.body)
        expect(data).toHaveLength(2)
        expect(mockSend).toHaveBeenCalledTimes(2)
    })

    it('returns 500 on DynamoDB error', async () => {
        mockSend.mockRejectedValueOnce(new Error('DDB error'))
        const result = await handler(makeEvent()) as any
        expect(result.statusCode).toBe(500)
    })
})
