import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from './handler'

const mockSend = vi.hoisted(() => vi.fn())

vi.mock('../../shared/db', () => ({
    dynamo: { send: mockSend },
    TABLE_NAME: 'test-table',
}))

const existingRule = { sk: 'RULE#1', id: 'r1', digit: '1', formatId: 'f1', formatLabel: 'Online' }
const existingFormat = { sk: 'FORMAT#f2', id: 'f2', label: 'Hybrid' }

const makeEvent = (id: string | undefined, body: object) => ({
    requestContext: { authorizer: { jwt: { claims: { sub: 'u1', 'cognito:groups': 'Admin' } } } },
    body: JSON.stringify(body),
    pathParameters: id ? { id } : {},
} as any)

const nonAdminEvent = {
    requestContext: { authorizer: { jwt: { claims: { sub: 'u1' } } } },
    body: null, pathParameters: {},
} as any

describe('settings/rule-update', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 403 for non-admin', async () => {
        const result = await handler(nonAdminEvent) as any
        expect(result.statusCode).toBe(403)
    })

    it('returns 400 when no id', async () => {
        const result = await handler(makeEvent(undefined, { formatId: 'f2' })) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 400 when formatId missing', async () => {
        const result = await handler(makeEvent('r1', {})) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 404 when rule not found', async () => {
        mockSend.mockResolvedValueOnce({ Items: [] })
        const result = await handler(makeEvent('r1', { formatId: 'f2' })) as any
        expect(result.statusCode).toBe(404)
    })

    it('returns 400 when new formatId not found', async () => {
        mockSend
            .mockResolvedValueOnce({ Items: [existingRule] })
            .mockResolvedValueOnce({ Items: [] })

        const result = await handler(makeEvent('r1', { formatId: 'nonexistent' })) as any
        expect(result.statusCode).toBe(400)
    })

    it('updates rule and returns 200 with new format label', async () => {
        mockSend
            .mockResolvedValueOnce({ Items: [existingRule] })
            .mockResolvedValueOnce({ Items: [existingFormat] })
            .mockResolvedValueOnce({})

        const result = await handler(makeEvent('r1', { formatId: 'f2' })) as any
        expect(result.statusCode).toBe(200)
        const { data } = JSON.parse(result.body)
        expect(data).toMatchObject({ id: 'r1', digit: '1', formatId: 'f2', formatLabel: 'Hybrid' })
    })

    it('returns 500 on error', async () => {
        mockSend.mockRejectedValueOnce(new Error('fail'))
        const result = await handler(makeEvent('r1', { formatId: 'f2' })) as any
        expect(result.statusCode).toBe(500)
    })
})
