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

describe('settings/get', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 403 for non-admin', async () => {
        const result = await handler(nonAdminEvent) as any
        expect(result.statusCode).toBe(403)
    })

    it('returns full settings shape', async () => {
        mockSend.mockResolvedValueOnce({
            Items: [
                { sk: 'BRANDING', institutionName: 'Test U', primaryColor: '#000', secondaryColor: null, logoUrl: null, faviconUrl: null },
                { sk: 'FORMAT#f1', id: 'f1', label: 'Online' },
                { sk: 'FORMAT#f2', id: 'f2', label: 'Hybrid' },
                { sk: 'RULE#1', id: 'r1', digit: '1', formatId: 'f1', formatLabel: 'Online' },
                { sk: 'TERM_LENGTH#tl1', id: 'tl1', label: '8 Weeks', weeks: 8 },
            ],
        })

        const result = await handler(adminEvent) as any
        expect(result.statusCode).toBe(200)
        const { data } = JSON.parse(result.body)
        expect(data.branding).toMatchObject({ institutionName: 'Test U' })
        expect(data.formats).toHaveLength(2)
        expect(data.rules).toHaveLength(1)
        expect(data.termLengths).toHaveLength(1)
    })

    it('returns null branding when not set', async () => {
        mockSend.mockResolvedValueOnce({ Items: [] })

        const result = await handler(adminEvent) as any
        expect(result.statusCode).toBe(200)
        const { data } = JSON.parse(result.body)
        expect(data.branding).toBeNull()
        expect(data.formats).toEqual([])
    })

    it('sorts formats alphabetically', async () => {
        mockSend.mockResolvedValueOnce({
            Items: [
                { sk: 'FORMAT#f2', id: 'f2', label: 'Hybrid' },
                { sk: 'FORMAT#f1', id: 'f1', label: 'Asynchronous' },
            ],
        })

        const result = await handler(adminEvent) as any
        const { data } = JSON.parse(result.body)
        expect(data.formats[0].label).toBe('Asynchronous')
        expect(data.formats[1].label).toBe('Hybrid')
    })

    it('returns 500 on error', async () => {
        mockSend.mockRejectedValueOnce(new Error('fail'))
        const result = await handler(adminEvent) as any
        expect(result.statusCode).toBe(500)
    })
})
