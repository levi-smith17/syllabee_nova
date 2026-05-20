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

describe('settings/format-create', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 403 for non-admin', async () => {
        const result = await handler(nonAdminEvent) as any
        expect(result.statusCode).toBe(403)
    })

    it('returns 400 when label is missing', async () => {
        const result = await handler(makeEvent({})) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 400 when label is blank', async () => {
        const result = await handler(makeEvent({ label: '   ' })) as any
        expect(result.statusCode).toBe(400)
    })

    it('creates format and returns 201 with id and label', async () => {
        mockSend.mockResolvedValueOnce({})

        const result = await handler(makeEvent({ label: 'Online' })) as any
        expect(result.statusCode).toBe(201)
        const { data } = JSON.parse(result.body)
        expect(typeof data.id).toBe('string')
        expect(data.label).toBe('Online')
    })

    it('returns 500 on error', async () => {
        mockSend.mockRejectedValueOnce(new Error('fail'))
        const result = await handler(makeEvent({ label: 'X' })) as any
        expect(result.statusCode).toBe(500)
    })
})
