import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from './handler'

const mockSend = vi.hoisted(() => vi.fn())

vi.mock('../../shared/db', () => ({
    dynamo: { send: mockSend },
    TABLE_NAME: 'test-table',
}))

const makeEvent = () => ({
    requestContext: { authorizer: { jwt: { claims: { sub: 'instructor-1' } } } },
    body: null,
    pathParameters: {},
} as any)

const sampleItem = {
    id: 'i1',
    studentId: 's1',
    studentName: 'Jane Doe',
    studentEmail: 'jane@test.com',
    sectionId: 'sec-1',
    status: 'ACTIVE',
    startDate: '2025-01-01',
    endDate: null,
    completedHours: 10,
    createdAt: '2025-01-01T00:00:00.000Z',
    createdBy: 'instructor-1',
}

describe('internship/list', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 200 with empty list when no internships', async () => {
        mockSend.mockResolvedValueOnce({ Items: [] })
        const result = await handler(makeEvent()) as any
        expect(result.statusCode).toBe(200)
        const { data } = JSON.parse(result.body)
        expect(data).toEqual([])
    })

    it('returns 200 with internship list', async () => {
        mockSend.mockResolvedValueOnce({ Items: [sampleItem] })
        const result = await handler(makeEvent()) as any
        expect(result.statusCode).toBe(200)
        const { data } = JSON.parse(result.body)
        expect(data).toHaveLength(1)
        expect(data[0].id).toBe('i1')
        expect(data[0].studentName).toBe('Jane Doe')
    })

    it('paginates through all results', async () => {
        mockSend
            .mockResolvedValueOnce({ Items: [sampleItem], LastEvaluatedKey: { pk: 'INTERNSHIP#i1', sk: 'METADATA' } })
            .mockResolvedValueOnce({ Items: [{ ...sampleItem, id: 'i2' }] })
        const result = await handler(makeEvent()) as any
        expect(result.statusCode).toBe(200)
        const { data } = JSON.parse(result.body)
        expect(data).toHaveLength(2)
        expect(mockSend).toHaveBeenCalledTimes(2)
    })

    it('returns 500 on DynamoDB error', async () => {
        mockSend.mockRejectedValueOnce(new Error('DynamoDB error'))
        const result = await handler(makeEvent()) as any
        expect(result.statusCode).toBe(500)
    })
})
