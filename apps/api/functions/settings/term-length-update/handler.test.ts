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

describe('settings/term-length-update', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 403 for non-admin', async () => {
        const result = await handler(nonAdminEvent) as any
        expect(result.statusCode).toBe(403)
    })

    it('returns 400 when no id', async () => {
        const result = await handler(makeEvent(undefined, { label: 'X', weeks: 8 })) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 404 when term length not found', async () => {
        mockSend.mockResolvedValueOnce({ Items: [] })
        const result = await handler(makeEvent('tl1', { label: 'X', weeks: 8 })) as any
        expect(result.statusCode).toBe(404)
    })

    it('returns 400 when label is blank', async () => {
        mockSend.mockResolvedValueOnce({ Items: [{ sk: 'TERM_LENGTH#tl1' }] })
        const result = await handler(makeEvent('tl1', { label: '', weeks: 8 })) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 400 when weeks is invalid', async () => {
        mockSend.mockResolvedValueOnce({ Items: [{ sk: 'TERM_LENGTH#tl1' }] })
        const result = await handler(makeEvent('tl1', { label: 'X', weeks: 0 })) as any
        expect(result.statusCode).toBe(400)
    })

    it('updates term length and returns 200', async () => {
        mockSend
            .mockResolvedValueOnce({ Items: [{ sk: 'TERM_LENGTH#tl1' }] })
            .mockResolvedValueOnce({})

        const result = await handler(makeEvent('tl1', { label: '16 Weeks', weeks: 16 })) as any
        expect(result.statusCode).toBe(200)
        expect(JSON.parse(result.body).data).toMatchObject({ id: 'tl1', label: '16 Weeks', weeks: 16 })
    })

    it('returns 500 on error', async () => {
        mockSend.mockRejectedValueOnce(new Error('fail'))
        const result = await handler(makeEvent('tl1', { label: 'X', weeks: 8 })) as any
        expect(result.statusCode).toBe(500)
    })
})
