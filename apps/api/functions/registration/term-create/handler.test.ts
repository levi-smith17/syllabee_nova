import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from './handler'

const mockSend = vi.hoisted(() => vi.fn())

vi.mock('../../shared/db', () => ({
    dynamo: { send: mockSend },
    TABLE_NAME: 'test-table',
}))

const makeEvent = (body: object) => ({
    requestContext: { authorizer: { jwt: { claims: { sub: 'u1', 'cognito:groups': 'Admin' } } } },
    body: JSON.stringify(body),
    pathParameters: {},
} as any)

const nonAdminEvent = {
    requestContext: { authorizer: { jwt: { claims: { sub: 'u1' } } } },
    body: null, pathParameters: {},
} as any

describe('registration/term-create', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 403 for non-admin', async () => {
        const result = await handler(nonAdminEvent) as any
        expect(result.statusCode).toBe(403)
    })

    it('returns 400 when required fields are missing', async () => {
        const result = await handler(makeEvent({ name: 'Fall 2024', code: 'FA24' })) as any
        expect(result.statusCode).toBe(400)
    })

    it('creates term and returns 201', async () => {
        mockSend.mockResolvedValueOnce({})

        const result = await handler(makeEvent({
            name: 'Fall 2024',
            code: 'FA24',
            startDate: '2024-08-19',
            endDate: '2024-12-13',
        })) as any

        expect(result.statusCode).toBe(201)
        const { data } = JSON.parse(result.body)
        expect(typeof data.id).toBe('string')
    })

    it('stores code uppercased', async () => {
        mockSend.mockResolvedValueOnce({})

        await handler(makeEvent({ name: 'Fall 2024', code: 'fa24', startDate: '2024-08-19', endDate: '2024-12-13' }))
        expect(mockSend.mock.calls[0][0].input.Item.code).toBe('FA24')
    })

    it('returns 500 on error', async () => {
        mockSend.mockRejectedValueOnce(new Error('fail'))
        const result = await handler(makeEvent({ name: 'X', code: 'X', startDate: 'X', endDate: 'X' })) as any
        expect(result.statusCode).toBe(500)
    })
})
