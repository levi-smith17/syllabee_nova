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

const makeEvent = (body: object) => ({
    requestContext: { authorizer: { jwt: { claims: { sub: 'instructor-1' } } } },
    body: JSON.stringify(body),
    pathParameters: {},
} as any)

describe('editor/syllabus-create', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 400 when title is missing', async () => {
        const result = await handler(makeEvent({})) as any
        expect(result.statusCode).toBe(400)
    })

    it('creates syllabus and returns 201 with id', async () => {
        mockSend.mockResolvedValueOnce({})

        const result = await handler(makeEvent({ title: 'CIS-101 Fall 2024' })) as any

        expect(result.statusCode).toBe(201)
        const { data } = JSON.parse(result.body)
        expect(data.id).toBeDefined()
        expect(mockSend).toHaveBeenCalledTimes(1)
        const putArg = mockSend.mock.calls[0][0]
        expect(putArg.input.Item).toMatchObject({
            title: 'CIS-101 Fall 2024',
            locked: false,
            interactiveView: false,
            ownerId: 'instructor-1',
        })
    })

    it('creates syllabus with all optional fields', async () => {
        mockSend.mockResolvedValueOnce({})
        const result = await handler(makeEvent({
            title: 'CIS-101',
            termCode: 'FA24',
            officeHours: 'MWF 9-10',
            interactiveView: true,
            timeout: 30,
            prohibitBacktracking: true,
            maxAttempts: 3,
            maxPoints: 200,
            randomizeResponses: true,
            pointsLadder: true,
            pointsLadderDeduction: 10,
        })) as any
        expect(result.statusCode).toBe(201)
    })

    it('returns 500 on DynamoDB error', async () => {
        mockSend.mockRejectedValueOnce(new Error('DDB error'))
        const result = await handler(makeEvent({ title: 'Test' })) as any
        expect(result.statusCode).toBe(500)
    })
})
