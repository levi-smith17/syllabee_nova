import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from './handler'

const mockSend = vi.hoisted(() => vi.fn())

vi.mock('../../shared/db', () => ({
    dynamo: { send: mockSend },
    TABLE_NAME: 'test-table',
}))

vi.mock('../../shared/auth', () => ({
    getUserId: () => 'instructor-1',
    getPathId: (event: any) => event.pathParameters?.id,
}))

const makeEvent = (id?: string) => ({
    requestContext: { authorizer: { jwt: { claims: { sub: 'instructor-1' } } } },
    body: null,
    pathParameters: id ? { id } : {},
} as any)

const metadata = {
    sk: 'METADATA',
    id: 'i1',
    studentId: 's1',
    studentName: 'Jane Doe',
    studentEmail: 'jane@test.com',
    sectionId: 'sec-1',
    status: 'ACTIVE',
    startDate: '2025-01-01',
    endDate: null,
    completedHours: 4,
    createdAt: '2025-01-01T00:00:00.000Z',
    createdBy: 'instructor-1',
}

const location = {
    sk: 'LOCATION#loc1',
    id: 'loc1',
    employerName: 'Acme Corp',
    validated: false,
    createdAt: '2025-01-01T00:00:00.000Z',
}

const journalEntry = {
    sk: 'JOURNAL#j1',
    id: 'j1',
    title: 'First day',
    description: 'Great experience',
    date: '2025-01-05',
    timeStart: '09:00',
    timeEnd: '13:00',
    totalMinutes: 240,
    verified: false,
    createdAt: '2025-01-05T00:00:00.000Z',
}

describe('internship/get', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 400 when id is missing', async () => {
        const result = await handler(makeEvent()) as any
        expect(result.statusCode).toBe(400)
    })

    it('returns 404 when internship not found', async () => {
        mockSend.mockResolvedValueOnce({ Items: [] })
        const result = await handler(makeEvent('i1')) as any
        expect(result.statusCode).toBe(404)
    })

    it('returns 200 with internship, locations, and journal entries', async () => {
        mockSend.mockResolvedValueOnce({ Items: [metadata, location, journalEntry] })
        const result = await handler(makeEvent('i1')) as any
        expect(result.statusCode).toBe(200)
        const { data } = JSON.parse(result.body)
        expect(data.internship.id).toBe('i1')
        expect(data.locations).toHaveLength(1)
        expect(data.locations[0].employerName).toBe('Acme Corp')
        expect(data.journalEntries).toHaveLength(1)
        expect(data.journalEntries[0].title).toBe('First day')
    })

    it('returns 500 on DynamoDB error', async () => {
        mockSend.mockRejectedValueOnce(new Error('DynamoDB error'))
        const result = await handler(makeEvent('i1')) as any
        expect(result.statusCode).toBe(500)
    })
})
