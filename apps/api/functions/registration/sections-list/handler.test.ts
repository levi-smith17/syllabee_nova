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

describe('registration/sections-list', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 403 for non-admin', async () => {
        const result = await handler(nonAdminEvent) as any
        expect(result.statusCode).toBe(403)
    })

    it('returns mapped sections', async () => {
        mockSend.mockResolvedValueOnce({
            Items: [{
                pk: 'SECTION#s1',
                courseId: 'c1',
                termId: 't1',
                sectionCode: '001',
                formatId: null,
                instructorId: null,
                roomNumber: '101',
                meetingDays: 'MWF',
                meetingTime: '09:00',
                isActive: true,
                createdAt: '2024-01-01',
            }],
        })

        const result = await handler(adminEvent) as any
        expect(result.statusCode).toBe(200)
        const { data } = JSON.parse(result.body)
        expect(data).toHaveLength(1)
        expect(data[0]).toMatchObject({ id: 's1', courseId: 'c1', termId: 't1', sectionCode: '001' })
    })

    it('paginates until no LastEvaluatedKey', async () => {
        const item = { pk: 'SECTION#s1', courseId: 'c1', termId: 't1', sectionCode: '001', createdAt: '' }
        mockSend
            .mockResolvedValueOnce({ Items: [item], LastEvaluatedKey: { pk: 'SECTION#s1' } })
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
