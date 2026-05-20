import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from './handler'

const mockSend = vi.hoisted(() => vi.fn())

vi.mock('../../shared/db', () => ({
    dynamo: { send: mockSend },
    TABLE_NAME: 'test-table',
}))

vi.mock('../../shared/auth', () => ({
    isAdmin: vi.fn(),
    getUserId: () => 'admin-1',
}))

import { isAdmin } from '../../shared/auth'

const makeEvent = (body: object) => ({
    requestContext: { authorizer: { jwt: { claims: { sub: 'admin-1', 'cognito:groups': 'Admin' } } } },
    body: JSON.stringify(body),
    pathParameters: {},
} as any)

describe('internship/settings-update', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        ;(isAdmin as any).mockResolvedValue(true)
    })

    it('returns 403 for non-admin', async () => {
        ;(isAdmin as any).mockResolvedValue(false)
        const result = await handler(makeEvent({ requiredHours: 200 })) as any
        expect(result.statusCode).toBe(403)
    })

    it('returns 400 when no fields provided', async () => {
        const result = await handler(makeEvent({})) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 400 for invalid requiredHours', async () => {
        const result = await handler(makeEvent({ requiredHours: -10 })) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 400 for invalid journalPoints', async () => {
        const result = await handler(makeEvent({ journalPoints: -5 })) as any
        expect(result.statusCode).toBe(400)
    })

    it('updates settings and returns 200', async () => {
        mockSend
            .mockResolvedValueOnce({ Item: null })
            .mockResolvedValueOnce({})
        const result = await handler(makeEvent({ requiredHours: 200, journalPoints: 80 })) as any
        expect(result.statusCode).toBe(200)
        const { data } = JSON.parse(result.body)
        expect(data.requiredHours).toBe(200)
        expect(data.journalPoints).toBe(80)
    })

    it('merges with existing settings', async () => {
        mockSend
            .mockResolvedValueOnce({ Item: { pk: 'SETTINGS', sk: 'INTERNSHIP', requiredHours: 224, journalPoints: 100 } })
            .mockResolvedValueOnce({})
        const result = await handler(makeEvent({ requiredHours: 280 })) as any
        expect(result.statusCode).toBe(200)
        const putArg = mockSend.mock.calls[1][0]
        expect(putArg.input.Item.requiredHours).toBe(280)
        expect(putArg.input.Item.journalPoints).toBe(100)
    })

    it('returns 500 on DynamoDB error', async () => {
        mockSend.mockRejectedValueOnce(new Error('DynamoDB error'))
        const result = await handler(makeEvent({ requiredHours: 200 })) as any
        expect(result.statusCode).toBe(500)
    })
})
