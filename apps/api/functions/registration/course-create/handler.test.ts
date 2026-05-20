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

describe('registration/course-create', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 403 for non-admin', async () => {
        const result = await handler(nonAdminEvent) as any
        expect(result.statusCode).toBe(403)
    })

    it('returns 400 when required fields are missing', async () => {
        const result = await handler(makeEvent({ title: 'X' })) as any
        expect(result.statusCode).toBe(400)
    })

    it('creates course and returns 201', async () => {
        mockSend
            .mockResolvedValueOnce({ Items: [] })
            .mockResolvedValueOnce({})

        const result = await handler(makeEvent({ code: 'CS101', title: 'Intro CS', creditHours: 3 })) as any
        expect(result.statusCode).toBe(201)
        const { data } = JSON.parse(result.body)
        expect(typeof data.id).toBe('string')
    })

    it('stores code uppercased', async () => {
        mockSend
            .mockResolvedValueOnce({ Items: [] })
            .mockResolvedValueOnce({})

        await handler(makeEvent({ code: 'cs101', title: 'Intro CS', creditHours: 3 }))
        const putCall = mockSend.mock.calls[1][0]
        expect(putCall.input.Item.code).toBe('CS101')
    })

    it('returns 409 when course code already exists', async () => {
        mockSend.mockResolvedValueOnce({ Items: [{ pk: 'COURSE#existing' }] })

        const result = await handler(makeEvent({ code: 'CS101', title: 'Intro CS', creditHours: 3 })) as any
        expect(result.statusCode).toBe(409)
    })

    it('returns 500 on error', async () => {
        mockSend
            .mockResolvedValueOnce({ Items: [] })
            .mockRejectedValueOnce(new Error('fail'))
        const result = await handler(makeEvent({ code: 'CS101', title: 'X', creditHours: 3 })) as any
        expect(result.statusCode).toBe(500)
    })
})
