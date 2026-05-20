import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from './handler'

const mockSend = vi.hoisted(() => vi.fn())

vi.mock('../../shared/db', () => ({
    dynamo: { send: mockSend },
    TABLE_NAME: 'test-table',
}))

const makeEvent = (params: { id?: string; locationId?: string }, body: object) => ({
    requestContext: { authorizer: { jwt: { claims: { sub: 'instructor-1' } } } },
    body: JSON.stringify(body),
    pathParameters: params,
} as any)

describe('internship/location-update', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 400 when path params are missing', async () => {
        const result = await handler(makeEvent({}, { employerName: 'Acme' })) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 404 when location not found', async () => {
        mockSend.mockResolvedValueOnce({ Item: null })
        const result = await handler(makeEvent({ id: 'i1', locationId: 'loc1' }, { employerName: 'Acme' })) as any
        expect(result.statusCode).toBe(404)
    })

    it('returns 400 when no updatable fields provided', async () => {
        mockSend.mockResolvedValueOnce({ Item: { pk: 'INTERNSHIP#i1', sk: 'LOCATION#loc1' } })
        const result = await handler(makeEvent({ id: 'i1', locationId: 'loc1' }, {})) as any
        expect(result.statusCode).toBe(400)
    })

    it('updates location fields and returns 200', async () => {
        mockSend
            .mockResolvedValueOnce({ Item: { pk: 'INTERNSHIP#i1', sk: 'LOCATION#loc1' } })
            .mockResolvedValueOnce({})
        const result = await handler(makeEvent({ id: 'i1', locationId: 'loc1' }, {
            employerName: 'New Name',
            validated: true,
        })) as any
        expect(result.statusCode).toBe(200)
        const { data } = JSON.parse(result.body)
        expect(data.id).toBe('loc1')
    })

    it('returns 500 on DynamoDB error', async () => {
        mockSend.mockRejectedValueOnce(new Error('DynamoDB error'))
        const result = await handler(makeEvent({ id: 'i1', locationId: 'loc1' }, { validated: true })) as any
        expect(result.statusCode).toBe(500)
    })
})
