import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from './handler'

const mockSend = vi.hoisted(() => vi.fn())

vi.mock('../../shared/db', () => ({
    dynamo: { send: mockSend },
    TABLE_NAME: 'test-table',
}))

const existingItem = { pk: 'COURSE#abc', code: 'CS101', title: 'Old Title', creditHours: 3, isInternship: false, isActive: true }

const makeEvent = (id: string | undefined, body: object) => ({
    requestContext: { authorizer: { jwt: { claims: { sub: 'u1', 'cognito:groups': 'Admin' } } } },
    body: JSON.stringify(body),
    pathParameters: id ? { id } : {},
} as any)

const nonAdminEvent = {
    requestContext: { authorizer: { jwt: { claims: { sub: 'u1' } } } },
    body: null, pathParameters: {},
} as any

describe('registration/course-update', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 403 for non-admin', async () => {
        const result = await handler(nonAdminEvent) as any
        expect(result.statusCode).toBe(403)
    })

    it('returns 400 when no id', async () => {
        const result = await handler(makeEvent(undefined, {})) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 404 when course not found', async () => {
        mockSend.mockResolvedValueOnce({ Item: undefined })
        const result = await handler(makeEvent('abc', { title: 'New' })) as any
        expect(result.statusCode).toBe(404)
    })

    it('updates course and returns 200', async () => {
        mockSend
            .mockResolvedValueOnce({ Item: existingItem })
            .mockResolvedValueOnce({})

        const result = await handler(makeEvent('abc', { title: 'New Title' })) as any
        expect(result.statusCode).toBe(200)
        expect(JSON.parse(result.body).data).toMatchObject({ id: 'abc' })
    })

    it('returns 500 on error', async () => {
        mockSend.mockRejectedValueOnce(new Error('fail'))
        const result = await handler(makeEvent('abc', { title: 'X' })) as any
        expect(result.statusCode).toBe(500)
    })
})
