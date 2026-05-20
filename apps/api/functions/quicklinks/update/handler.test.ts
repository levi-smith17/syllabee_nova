import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from './handler'

const mockSend = vi.hoisted(() => vi.fn())

vi.mock('../../shared/db', () => ({
    dynamo: { send: mockSend },
    TABLE_NAME: 'test-table',
}))

const makeEvent = (id: string | undefined, body: object) => ({
    requestContext: { authorizer: { jwt: { claims: { sub: 'u1', 'cognito:groups': 'Admin' } } } },
    body: JSON.stringify(body),
    pathParameters: id ? { id } : {},
} as any)

const nonAdminEvent = {
    requestContext: { authorizer: { jwt: { claims: { sub: 'u1' } } } },
    body: null, pathParameters: {},
} as any

describe('quicklinks/update', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 403 for non-admin', async () => {
        const result = await handler(nonAdminEvent) as any
        expect(result.statusCode).toBe(403)
    })

    it('returns 400 when no id', async () => {
        const result = await handler(makeEvent(undefined, { label: 'X' })) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 404 when item not found', async () => {
        mockSend.mockResolvedValueOnce({ Items: [] })
        const result = await handler(makeEvent('ql-1', { label: 'X' })) as any
        expect(result.statusCode).toBe(404)
    })

    it('updates quick link and returns 200', async () => {
        mockSend
            .mockResolvedValueOnce({ Items: [{ sk: 'QUICKLINK#000000#ql-1', label: 'Old', url: 'https://old.com', restricted: false }] })
            .mockResolvedValueOnce({})

        const result = await handler(makeEvent('ql-1', { label: 'New', url: 'https://new.com' })) as any
        expect(result.statusCode).toBe(200)
        expect(JSON.parse(result.body).data).toMatchObject({ id: 'ql-1' })
    })

    it('returns 500 on error', async () => {
        mockSend.mockRejectedValueOnce(new Error('fail'))
        const result = await handler(makeEvent('ql-1', { label: 'X' })) as any
        expect(result.statusCode).toBe(500)
    })
})
