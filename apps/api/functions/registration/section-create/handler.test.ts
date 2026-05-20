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

describe('registration/section-create', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 403 for non-admin', async () => {
        const result = await handler(nonAdminEvent) as any
        expect(result.statusCode).toBe(403)
    })

    it('returns 400 when required fields are missing', async () => {
        const result = await handler(makeEvent({ courseId: 'c1', termId: 't1' })) as any
        expect(result.statusCode).toBe(400)
    })

    it('creates section and returns 201', async () => {
        mockSend.mockResolvedValueOnce({})

        const result = await handler(makeEvent({ courseId: 'c1', termId: 't1', sectionCode: '001' })) as any
        expect(result.statusCode).toBe(201)
        const { data } = JSON.parse(result.body)
        expect(typeof data.id).toBe('string')
    })

    it('includes optional fields in the stored item', async () => {
        mockSend.mockResolvedValueOnce({})

        await handler(makeEvent({
            courseId: 'c1', termId: 't1', sectionCode: '001',
            roomNumber: '101', meetingDays: 'MWF', meetingTime: '09:00',
        }))

        const item = mockSend.mock.calls[0][0].input.Item
        expect(item.roomNumber).toBe('101')
        expect(item.meetingDays).toBe('MWF')
    })

    it('returns 500 on error', async () => {
        mockSend.mockRejectedValueOnce(new Error('fail'))
        const result = await handler(makeEvent({ courseId: 'c1', termId: 't1', sectionCode: '001' })) as any
        expect(result.statusCode).toBe(500)
    })
})
