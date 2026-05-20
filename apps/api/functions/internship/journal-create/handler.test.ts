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

const makeEvent = (id: string | undefined, body: object) => ({
    requestContext: { authorizer: { jwt: { claims: { sub: 'instructor-1' } } } },
    body: JSON.stringify(body),
    pathParameters: id ? { id } : {},
} as any)

const validBody = {
    title: 'First day',
    description: 'Observed office operations',
    date: '2025-01-05',
    timeStart: '09:00',
    timeEnd: '13:00',
}

describe('internship/journal-create', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 400 when internshipId is missing', async () => {
        const result = await handler(makeEvent(undefined, validBody)) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 400 when required fields are missing', async () => {
        const result = await handler(makeEvent('i1', { title: 'Test' })) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 400 when timeStart is not on 15-min boundary', async () => {
        const result = await handler(makeEvent('i1', { ...validBody, timeStart: '09:07' })) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 400 when timeEnd is not on 15-min boundary', async () => {
        const result = await handler(makeEvent('i1', { ...validBody, timeEnd: '13:05' })) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 400 when timeEnd is not after timeStart', async () => {
        const result = await handler(makeEvent('i1', { ...validBody, timeStart: '13:00', timeEnd: '09:00' })) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 404 when internship not found', async () => {
        mockSend.mockResolvedValueOnce({ Item: null })
        const result = await handler(makeEvent('i1', validBody)) as any
        expect(result.statusCode).toBe(404)
    })

    it('creates journal entry and returns 201 with totalMinutes', async () => {
        mockSend
            .mockResolvedValueOnce({ Item: { pk: 'INTERNSHIP#i1', sk: 'METADATA', completedHours: 0 } })
            .mockResolvedValueOnce({})  // PutCommand
            .mockResolvedValueOnce({})  // UpdateCommand completedHours
        const result = await handler(makeEvent('i1', validBody)) as any
        expect(result.statusCode).toBe(201)
        const { data } = JSON.parse(result.body)
        expect(data.id).toBeDefined()
        expect(data.totalMinutes).toBe(240) // 09:00 → 13:00 = 4h = 240min
    })

    it('correctly accumulates hours on existing internship', async () => {
        mockSend
            .mockResolvedValueOnce({ Item: { pk: 'INTERNSHIP#i1', sk: 'METADATA', completedHours: 2 } })
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({})
        await handler(makeEvent('i1', { ...validBody, timeStart: '14:00', timeEnd: '16:00' }))
        const updateArg = mockSend.mock.calls[2][0]
        expect(updateArg.input.ExpressionAttributeValues[':hours']).toBe(4) // 2 existing + 2 new
    })

    it('returns 500 on DynamoDB error', async () => {
        mockSend.mockRejectedValueOnce(new Error('DynamoDB error'))
        const result = await handler(makeEvent('i1', validBody)) as any
        expect(result.statusCode).toBe(500)
    })
})
