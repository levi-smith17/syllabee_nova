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

describe('settings/rule-create', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 403 for non-admin', async () => {
        const result = await handler(nonAdminEvent) as any
        expect(result.statusCode).toBe(403)
    })

    it('returns 400 when required fields are missing', async () => {
        const result = await handler(makeEvent({ digit: '1' })) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 400 when digit is not 0-9', async () => {
        const result = await handler(makeEvent({ digit: 'A', formatId: 'f1' })) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 409 when rule for that digit already exists', async () => {
        mockSend.mockResolvedValueOnce({ Items: [{ sk: 'RULE#1' }] })

        const result = await handler(makeEvent({ digit: '1', formatId: 'f1' })) as any
        expect(result.statusCode).toBe(409)
    })

    it('returns 400 when formatId not found', async () => {
        mockSend
            .mockResolvedValueOnce({ Items: [] })
            .mockResolvedValueOnce({ Items: [] })

        const result = await handler(makeEvent({ digit: '1', formatId: 'nonexistent' })) as any
        expect(result.statusCode).toBe(400)
    })

    it('creates rule and returns 201', async () => {
        mockSend
            .mockResolvedValueOnce({ Items: [] })
            .mockResolvedValueOnce({ Items: [{ sk: 'FORMAT#f1', id: 'f1', label: 'Online' }] })
            .mockResolvedValueOnce({})

        const result = await handler(makeEvent({ digit: '1', formatId: 'f1' })) as any
        expect(result.statusCode).toBe(201)
        const { data } = JSON.parse(result.body)
        expect(data).toMatchObject({ digit: '1', formatId: 'f1', formatLabel: 'Online' })
    })

    it('returns 500 on error', async () => {
        mockSend.mockRejectedValueOnce(new Error('fail'))
        const result = await handler(makeEvent({ digit: '1', formatId: 'f1' })) as any
        expect(result.statusCode).toBe(500)
    })
})
