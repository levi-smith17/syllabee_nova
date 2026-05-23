import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    isSectionLinkedBySegments,
    recomputeSectionLink,
    MasterSyllabusConflictError,
} from './sync-section-syllabus'

const mockSend = vi.hoisted(() => vi.fn())

vi.mock('./db', () => ({
    dynamo: { send: mockSend },
    TABLE_NAME: 'test-table',
}))

describe('isSectionLinkedBySegments', () => {
    it('returns true for global segment (empty sections)', () => {
        expect(isSectionLinkedBySegments([{ sk: 'SEG#a', sections: [] }], 's1')).toBe(true)
    })

    it('returns true when section id is listed', () => {
        expect(isSectionLinkedBySegments([{ sk: 'SEG#a', sections: ['s1'] }], 's1')).toBe(true)
    })

    it('returns false when section id is not listed and not global', () => {
        expect(isSectionLinkedBySegments([{ sk: 'SEG#a', sections: ['s2'] }], 's1')).toBe(false)
    })
})

describe('recomputeSectionLink', () => {
    beforeEach(() => vi.resetAllMocks())

    it('sets masterSyllabusId when section is linked', async () => {
        mockSend
            .mockResolvedValueOnce({ Item: {} })
            .mockResolvedValueOnce({})
        await recomputeSectionLink('syl1', 'sec1', [{ sk: 'SEG#a', sections: ['sec1'] }])
        const update = mockSend.mock.calls[1][0]
        expect(update.input.UpdateExpression).toContain('SET masterSyllabusId')
    })

    it('skips set when already assigned to same syllabus', async () => {
        mockSend.mockResolvedValueOnce({ Item: { masterSyllabusId: 'syl1' } })
        await recomputeSectionLink('syl1', 'sec1', [{ sk: 'SEG#a', sections: ['sec1'] }])
        expect(mockSend).toHaveBeenCalledTimes(1)
    })

    it('throws conflict when section belongs to another syllabus', async () => {
        mockSend.mockResolvedValueOnce({ Item: { masterSyllabusId: 'other' } })
        await expect(
            recomputeSectionLink('syl1', 'sec1', [{ sk: 'SEG#a', sections: ['sec1'] }])
        ).rejects.toThrow(MasterSyllabusConflictError)
    })

    it('removes masterSyllabusId when section is no longer linked', async () => {
        mockSend
            .mockResolvedValueOnce({ Item: { masterSyllabusId: 'syl1' } })
            .mockResolvedValueOnce({})
        await recomputeSectionLink('syl1', 'sec1', [{ sk: 'SEG#a', sections: ['sec2'] }])
        const update = mockSend.mock.calls[1][0]
        expect(update.input.UpdateExpression).toContain('REMOVE masterSyllabusId')
    })

    it('does not remove when masterSyllabusId points elsewhere', async () => {
        mockSend.mockResolvedValueOnce({ Item: { masterSyllabusId: 'other' } })
        await recomputeSectionLink('syl1', 'sec1', [{ sk: 'SEG#a', sections: ['sec2'] }])
        expect(mockSend).toHaveBeenCalledTimes(1)
    })
})
