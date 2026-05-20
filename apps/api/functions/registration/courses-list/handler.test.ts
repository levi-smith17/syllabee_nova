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

describe('registration/courses-list', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 403 for non-admin', async () => {
        const result = await handler(nonAdminEvent) as any
        expect(result.statusCode).toBe(403)
    })

    it('returns mapped courses', async () => {
        mockSend.mockResolvedValueOnce({
            Items: [{
                pk: 'COURSE#abc-123',
                code: 'CS101',
                title: 'Intro to CS',
                description: null,
                creditHours: 3,
                isInternship: false,
                isActive: true,
                createdAt: '2024-01-01T00:00:00Z',
            }],
        })

        const result = await handler(adminEvent) as any
        expect(result.statusCode).toBe(200)
        const { data } = JSON.parse(result.body)
        expect(data).toHaveLength(1)
        expect(data[0]).toMatchObject({ id: 'abc-123', code: 'CS101', title: 'Intro to CS', creditHours: 3 })
    })

    it('paginates until no LastEvaluatedKey', async () => {
        const item = { pk: 'COURSE#x', code: 'X', title: 'X', creditHours: 1, createdAt: '' }
        mockSend
            .mockResolvedValueOnce({ Items: [item], LastEvaluatedKey: { pk: 'COURSE#x' } })
            .mockResolvedValueOnce({ Items: [item] })

        const result = await handler(adminEvent) as any
        expect(result.statusCode).toBe(200)
        expect(JSON.parse(result.body).data).toHaveLength(2)
    })

    it('returns 500 on error', async () => {
        mockSend.mockRejectedValueOnce(new Error('fail'))
        const result = await handler(adminEvent) as any
        expect(result.statusCode).toBe(500)
    })
})
