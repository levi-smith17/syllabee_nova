import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from './handler'

const mockSend = vi.hoisted(() => vi.fn())

vi.mock('../../shared/db', () => ({
    dynamo: { send: mockSend },
    TABLE_NAME: 'test-table',
}))

const existingItem = { pk: 'SECTION#s1', courseId: 'c1', termId: 't1', sectionCode: '001', formatId: null, instructorId: null, roomNumber: null, meetingDays: null, meetingTime: null, isActive: true }

const makeEvent = (id: string | undefined, body: object) => ({
    requestContext: { authorizer: { jwt: { claims: { sub: 'u1', 'cognito:groups': 'Admin' } } } },
    body: JSON.stringify(body),
    pathParameters: id ? { id } : {},
} as any)

const nonAdminEvent = {
    requestContext: { authorizer: { jwt: { claims: { sub: 'u1' } } } },
    body: null, pathParameters: {},
} as any

describe('registration/section-update', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 403 for non-admin', async () => {
        const result = await handler(nonAdminEvent) as any
        expect(result.statusCode).toBe(403)
    })

    it('returns 400 when no id', async () => {
        const result = await handler(makeEvent(undefined, {})) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 404 when section not found', async () => {
        mockSend.mockResolvedValueOnce({ Item: undefined })
        const result = await handler(makeEvent('s1', { sectionCode: '002' })) as any
        expect(result.statusCode).toBe(404)
    })

    it('updates section and returns 200', async () => {
        mockSend
            .mockResolvedValueOnce({ Item: existingItem })
            .mockResolvedValueOnce({})

        const result = await handler(makeEvent('s1', { sectionCode: '002', roomNumber: '202' })) as any
        expect(result.statusCode).toBe(200)
        expect(JSON.parse(result.body).data).toMatchObject({ id: 's1' })
    })

    it('returns 500 on error', async () => {
        mockSend.mockRejectedValueOnce(new Error('fail'))
        const result = await handler(makeEvent('s1', {})) as any
        expect(result.statusCode).toBe(500)
    })
})
