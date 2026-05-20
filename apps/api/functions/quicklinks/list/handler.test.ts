import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from './handler'

const mockSend = vi.hoisted(() => vi.fn())

vi.mock('../../shared/db', () => ({
    dynamo: { send: mockSend },
    TABLE_NAME: 'test-table',
}))

const adminEvent = {
    requestContext: { authorizer: { jwt: { claims: { sub: 'u1', 'cognito:groups': 'Admin' } } } },
    body: null, pathParameters: {},
} as any

const nonAdminEvent = {
    requestContext: { authorizer: { jwt: { claims: { sub: 'u1' } } } },
    body: null, pathParameters: {},
} as any

describe('quicklinks/list', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 403 for non-admin', async () => {
        const result = await handler(nonAdminEvent) as any
        expect(result.statusCode).toBe(403)
    })

    it('returns mapped quick links', async () => {
        mockSend.mockResolvedValueOnce({
            Items: [
                { id: 'ql1', label: 'Canvas', url: 'https://canvas.edu', icon: 'book', restricted: false, sortOrder: 0 },
            ],
        })

        const result = await handler(adminEvent) as any
        expect(result.statusCode).toBe(200)
        const { data } = JSON.parse(result.body)
        expect(data).toHaveLength(1)
        expect(data[0]).toMatchObject({ id: 'ql1', label: 'Canvas', url: 'https://canvas.edu' })
    })

    it('returns empty array when no items', async () => {
        mockSend.mockResolvedValueOnce({ Items: [] })
        const result = await handler(adminEvent) as any
        expect(result.statusCode).toBe(200)
        expect(JSON.parse(result.body).data).toEqual([])
    })

    it('returns 500 on error', async () => {
        mockSend.mockRejectedValueOnce(new Error('fail'))
        const result = await handler(adminEvent) as any
        expect(result.statusCode).toBe(500)
    })
})
