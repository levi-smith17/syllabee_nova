import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from './handler'

const mockSend = vi.hoisted(() => vi.fn())

vi.mock('../../shared/db', () => ({
    dynamo: { send: mockSend },
    TABLE_NAME: 'test-table',
}))

const adminEvent = {
    requestContext: { authorizer: { jwt: { claims: { sub: 'u1', 'cognito:groups': 'Admin' } } } },
    body: null, pathParameters: {},
} as any

const nonAdminEvent = {
    requestContext: { authorizer: { jwt: { claims: { sub: 'u1' } } } },
    body: null, pathParameters: {},
} as any

describe('registration/terms-list', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 403 for non-admin', async () => {
        const result = await handler(nonAdminEvent) as any
        expect(result.statusCode).toBe(403)
    })

    it('returns mapped terms', async () => {
        mockSend.mockResolvedValueOnce({
            Items: [{
                pk: 'TERM#t1',
                name: 'Fall 2024',
                code: 'FA24',
                startDate: '2024-08-19',
                endDate: '2024-12-13',
                isActive: true,
                createdAt: '2024-01-01',
            }],
        })

        const result = await handler(adminEvent) as any
        expect(result.statusCode).toBe(200)
        const { data } = JSON.parse(result.body)
        expect(data).toHaveLength(1)
        expect(data[0]).toMatchObject({ id: 't1', name: 'Fall 2024', code: 'FA24' })
    })

    it('paginates until no LastEvaluatedKey', async () => {
        const item = { pk: 'TERM#t1', name: 'X', code: 'X', startDate: '', endDate: '', createdAt: '' }
        mockSend
            .mockResolvedValueOnce({ Items: [item], LastEvaluatedKey: { pk: 'TERM#t1' } })
            .mockResolvedValueOnce({ Items: [item] })

        const result = await handler(adminEvent) as any
        expect(JSON.parse(result.body).data).toHaveLength(2)
    })

    it('returns 500 on error', async () => {
        mockSend.mockRejectedValueOnce(new Error('fail'))
        const result = await handler(adminEvent) as any
        expect(result.statusCode).toBe(500)
    })
})
