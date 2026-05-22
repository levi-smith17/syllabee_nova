import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from './handler'

const mockSend = vi.hoisted(() => vi.fn())

vi.mock('../../shared/db', () => ({
    dynamo: { send: mockSend },
    TABLE_NAME: 'test-table',
}))

const makeEvent = () => ({} as any)

describe('quicklinks/list', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns all quick links without auth', async () => {
        mockSend.mockResolvedValueOnce({
            Items: [
                { id: 'ql1', label: 'Canvas', url: 'https://canvas.edu', icon: 'book', restricted: false, sortOrder: 0 },
                { id: 'ql2', label: 'Staff Portal', url: 'https://staff.edu', icon: 'lock', restricted: true, sortOrder: 1 },
            ],
        })

        const result = await handler(makeEvent()) as any
        expect(result.statusCode).toBe(200)
        const { data } = JSON.parse(result.body)
        expect(data).toHaveLength(2)
        expect(data[0]).toMatchObject({ id: 'ql1', label: 'Canvas', restricted: false })
        expect(data[1]).toMatchObject({ id: 'ql2', label: 'Staff Portal', restricted: true })
    })

    it('returns links sorted by sortOrder', async () => {
        mockSend.mockResolvedValueOnce({
            Items: [
                { id: 'ql2', label: 'B', url: 'https://b.edu', sortOrder: 1 },
                { id: 'ql1', label: 'A', url: 'https://a.edu', sortOrder: 0 },
            ],
        })

        const result = await handler(makeEvent()) as any
        const { data } = JSON.parse(result.body)
        expect(data[0].id).toBe('ql1')
        expect(data[1].id).toBe('ql2')
    })

    it('returns empty array when no items', async () => {
        mockSend.mockResolvedValueOnce({ Items: [] })
        const result = await handler(makeEvent()) as any
        expect(result.statusCode).toBe(200)
        expect(JSON.parse(result.body).data).toEqual([])
    })

    it('returns 500 on error', async () => {
        mockSend.mockRejectedValueOnce(new Error('fail'))
        const result = await handler(makeEvent()) as any
        expect(result.statusCode).toBe(500)
    })
})
