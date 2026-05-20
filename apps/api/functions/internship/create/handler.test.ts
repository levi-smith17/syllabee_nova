import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from './handler'

const mockSend = vi.hoisted(() => vi.fn())

vi.mock('../../shared/db', () => ({
    dynamo: { send: mockSend },
    TABLE_NAME: 'test-table',
}))

vi.mock('../../shared/auth', () => ({
    getUserId: () => 'instructor-1',
    getPathId: (event: any) => event.pathParameters?.id,
}))

const makeEvent = (body: object) => ({
    requestContext: { authorizer: { jwt: { claims: { sub: 'instructor-1' } } } },
    body: JSON.stringify(body),
    pathParameters: {},
} as any)

describe('internship/create', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 400 when required fields are missing', async () => {
        const result = await handler(makeEvent({ studentId: 's1' })) as any
        expect(result.statusCode).toBe(400)
    })

    it('creates internship and returns 201 with id', async () => {
        mockSend.mockResolvedValueOnce({})

        const result = await handler(makeEvent({
            studentId: 's1',
            studentName: 'Jane Doe',
            studentEmail: 'jane@test.com',
            sectionId: 'sec-1',
        })) as any

        expect(result.statusCode).toBe(201)
        const { data } = JSON.parse(result.body)
        expect(data.id).toBeDefined()
        expect(mockSend).toHaveBeenCalledTimes(1)
        const putArg = mockSend.mock.calls[0][0]
        expect(putArg.input.Item).toMatchObject({
            studentId: 's1',
            studentName: 'Jane Doe',
            studentEmail: 'jane@test.com',
            status: 'PENDING',
            completedHours: 0,
        })
    })

    it('returns 201 without optional fields', async () => {
        mockSend.mockResolvedValueOnce({})
        const result = await handler(makeEvent({
            studentId: 's2',
            studentName: 'John Smith',
            studentEmail: 'john@test.com',
        })) as any
        expect(result.statusCode).toBe(201)
    })

    it('returns 500 on DynamoDB error', async () => {
        mockSend.mockRejectedValueOnce(new Error('DynamoDB error'))
        const result = await handler(makeEvent({
            studentId: 's1',
            studentName: 'Jane Doe',
            studentEmail: 'jane@test.com',
        })) as any
        expect(result.statusCode).toBe(500)
    })
})
