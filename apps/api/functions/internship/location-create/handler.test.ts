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

describe('internship/location-create', () => {
    beforeEach(() => vi.resetAllMocks())

    it('returns 400 when internshipId is missing', async () => {
        const result = await handler(makeEvent(undefined, { employerName: 'Acme' })) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 400 when employerName is missing', async () => {
        const result = await handler(makeEvent('i1', {})) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 404 when internship not found', async () => {
        mockSend.mockResolvedValueOnce({ Item: null })
        const result = await handler(makeEvent('i1', { employerName: 'Acme' })) as any
        expect(result.statusCode).toBe(404)
    })

    it('creates location and returns 201 with id', async () => {
        mockSend
            .mockResolvedValueOnce({ Item: { pk: 'INTERNSHIP#i1', sk: 'METADATA' } })
            .mockResolvedValueOnce({})
        const result = await handler(makeEvent('i1', {
            employerName: 'Acme Corp',
            city: 'Dayton',
            state: 'OH',
            supervisorName: 'Bob',
        })) as any
        expect(result.statusCode).toBe(201)
        const { data } = JSON.parse(result.body)
        expect(data.id).toBeDefined()
        const putArg = mockSend.mock.calls[1][0]
        expect(putArg.input.Item.employerName).toBe('Acme Corp')
        expect(putArg.input.Item.validated).toBe(false)
    })

    it('returns 500 on DynamoDB error', async () => {
        mockSend.mockRejectedValueOnce(new Error('DynamoDB error'))
        const result = await handler(makeEvent('i1', { employerName: 'Acme' })) as any
        expect(result.statusCode).toBe(500)
    })
})
