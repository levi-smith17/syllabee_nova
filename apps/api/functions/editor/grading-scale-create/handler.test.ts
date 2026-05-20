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

const validGrades = [
    { letter: 'A', minPercent: 90, maxPercent: 100 },
    { letter: 'B', minPercent: 80, maxPercent: 89 },
]

describe('editor/grading-scale-create', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 400 when name is missing', async () => {
        const result = await handler(makeEvent({ grades: validGrades })) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 400 when grades is empty or missing', async () => {
        const result = await handler(makeEvent({ name: 'Standard', grades: [] })) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 400 when a grade is missing required fields', async () => {
        const result = await handler(makeEvent({ name: 'Standard', grades: [{ letter: 'A' }] })) as any
        expect(result.statusCode).toBe(400)
    })

    it('creates scale with grades and returns 201', async () => {
        mockSend.mockResolvedValue({})
        const result = await handler(makeEvent({ name: 'Standard', grades: validGrades })) as any
        expect(result.statusCode).toBe(201)
        const { data } = JSON.parse(result.body)
        expect(data.id).toBeDefined()
        // 1 metadata put + 2 grade puts
        expect(mockSend).toHaveBeenCalledTimes(3)
        const metaPut = mockSend.mock.calls[0][0]
        expect(metaPut.input.Item.sk).toBe('METADATA')
        expect(metaPut.input.Item.name).toBe('Standard')
    })

    it('returns 500 on DynamoDB error', async () => {
        mockSend.mockRejectedValueOnce(new Error('DDB error'))
        const result = await handler(makeEvent({ name: 'Standard', grades: validGrades })) as any
        expect(result.statusCode).toBe(500)
    })
})
