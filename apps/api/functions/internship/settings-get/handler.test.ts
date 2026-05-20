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

describe('internship/settings-get', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns defaults when no settings record exists', async () => {
        mockSend.mockResolvedValueOnce({ Item: null })
        const result = await handler(makeEvent()) as any
        expect(result.statusCode).toBe(200)
        const { data } = JSON.parse(result.body)
        expect(data.requiredHours).toBe(224)
        expect(data.journalPoints).toBe(100)
    })

    it('returns stored settings', async () => {
        mockSend.mockResolvedValueOnce({ Item: { requiredHours: 280, journalPoints: 50 } })
        const result = await handler(makeEvent()) as any
        expect(result.statusCode).toBe(200)
        const { data } = JSON.parse(result.body)
        expect(data.requiredHours).toBe(280)
        expect(data.journalPoints).toBe(50)
    })

    it('returns 500 on DynamoDB error', async () => {
        mockSend.mockRejectedValueOnce(new Error('DynamoDB error'))
        const result = await handler(makeEvent()) as any
        expect(result.statusCode).toBe(500)
    })
})
