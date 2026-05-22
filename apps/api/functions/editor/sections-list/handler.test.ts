import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from './handler'

const mockSend = vi.hoisted(() => vi.fn())

vi.mock('../../shared/db', () => ({
    dynamo: { send: mockSend },
    TABLE_NAME: 'test-table',
}))

vi.mock('../../shared/auth', () => ({
    getUserId: vi.fn(() => 'instructor-1'),
    isAdmin: vi.fn(async () => false),
}))

const makeEvent = () => ({
    requestContext: { authorizer: { jwt: { claims: { sub: 'instructor-1' } } } },
} as any)

const sectionItem = (id: string, overrides: Record<string, unknown> = {}) => ({
    pk: `SECTION#${id}`,
    sk: 'METADATA',
    courseId: 'CIS-211S',
    termId: '2025SS',
    sectionCode: '801SS',
    instructorId: 'instructor-1',
    isActive: true,
    meetingDays: 'MWF',
    meetingTime: '09:00',
    ...overrides,
})

describe('editor/sections-list', () => {
    beforeEach(() => vi.resetAllMocks())

    it('returns 200 with active sections for the authenticated user', async () => {
        mockSend
            .mockResolvedValueOnce({ Items: [sectionItem('sec-1'), sectionItem('sec-2')] })
            // GetCommand: COURSE#CIS-211S
            .mockResolvedValueOnce({ Item: { pk: 'COURSE#CIS-211S', sk: 'METADATA', code: 'CIS-211S' } })
            // GetCommand: TERM#2025SS
            .mockResolvedValueOnce({ Item: { pk: 'TERM#2025SS', sk: 'METADATA', code: '2025SS' } })

        const result = await handler(makeEvent()) as any
        expect(result.statusCode).toBe(200)
        const body = JSON.parse(result.body)
        expect(body.data).toHaveLength(2)
        expect(body.data[0]).toMatchObject({
            id: 'sec-1',
            courseId: 'CIS-211S',
            courseCode: 'CIS-211S',
            termId: '2025SS',
            termCode: '2025SS',
            sectionCode: '801SS',
        })
    })

    it('returns empty array when no sections match', async () => {
        mockSend.mockResolvedValueOnce({ Items: [] })

        const result = await handler(makeEvent()) as any
        expect(result.statusCode).toBe(200)
        const body = JSON.parse(result.body)
        expect(body.data).toHaveLength(0)
    })

    it('handles pagination (LastEvaluatedKey)', async () => {
        mockSend
            .mockResolvedValueOnce({ Items: [sectionItem('sec-1')], LastEvaluatedKey: { pk: 'SECTION#sec-1', sk: 'METADATA' } })
            .mockResolvedValueOnce({ Items: [sectionItem('sec-2')] })
            // GetCommand: COURSE#CIS-211S
            .mockResolvedValueOnce({ Item: { pk: 'COURSE#CIS-211S', sk: 'METADATA', code: 'CIS-211S' } })
            // GetCommand: TERM#2025SS
            .mockResolvedValueOnce({ Item: { pk: 'TERM#2025SS', sk: 'METADATA', code: '2025SS' } })

        const result = await handler(makeEvent()) as any
        expect(result.statusCode).toBe(200)
        const body = JSON.parse(result.body)
        expect(body.data).toHaveLength(2)
    })

    it('returns 500 on DynamoDB error', async () => {
        mockSend.mockRejectedValueOnce(new Error('DDB error'))

        const result = await handler(makeEvent()) as any
        expect(result.statusCode).toBe(500)
    })
})
