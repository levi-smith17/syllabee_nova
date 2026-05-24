import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from './handler'

const mockSend = vi.hoisted(() => vi.fn())

vi.mock('../../shared/db', () => ({
    dynamo: { send: mockSend },
    TABLE_NAME: 'test-table',
}))

const makeEvent = (courseCode: string, termCode: string, sectionCode: string) => ({
    pathParameters: { courseCode, termCode, sectionCode },
} as any)

const courseItem = { pk: 'COURSE#c1', sk: 'METADATA', code: 'CIS-121S', name: 'Introduction to Programming' }
const termItem = { pk: 'TERM#t1', sk: 'METADATA', code: '2025SS', name: 'Spring 2025' }
const sectionItem = {
    pk: 'SECTION#s1', sk: 'METADATA',
    courseId: 'c1', termId: 't1', sectionCode: '801SS',
    isActive: true, masterSyllabusId: 'syl1', instructorId: 'instr1',
}
const syllabusMetadata = {
    pk: 'SYLLABUS#syl1', sk: 'METADATA',
    title: 'CIS-121S Syllabus', termCode: '2025SS',
    interactiveView: false, prohibitBacktracking: false,
    maxAttempts: 1, maxPoints: 0, pointsLadder: false, pointsLadderDeduction: 0,
    randomizeResponses: false, timeout: 0,
}
const segItem = {
    pk: 'SYLLABUS#syl1', sk: 'SEG#seg1',
    id: 'seg1', name: 'Course Policies',
    printHeading: 2, isVisible: true, sortOrder: 0,
    sections: [],
}
const blkItem = {
    pk: 'SYLLABUS#syl1', sk: 'BLK#seg1#blk1',
    id: 'blk1', type: 'content_block', name: 'Welcome',
    printHeading: 3, sortOrder: 0, content: { html: '<p>Hello</p>' },
}
const brandingItem = { pk: 'SETTINGS', sk: 'BRANDING', institutionName: 'Edison State' }

// Happy-path mocks: GSI hits for course, term, section (no scan fallbacks needed).
// Call order: courseGsi, termGsi, sectionGsi, [parallel] courseDetail + syllabusRes + branding
function setupMocks({
    hasCourse = true,
    hasTerm = true,
    hasSection = true,
    hasSyllabus = true,
    segVisible = true,
    sectionSpecific = false,
} = {}) {
    mockSend
        // courseGsi
        .mockResolvedValueOnce({ Items: hasCourse ? [courseItem] : [] })
        // termGsi
        .mockResolvedValueOnce({ Items: hasTerm ? [termItem] : [] })
        // sectionGsi
        .mockResolvedValueOnce({ Items: hasSection ? [sectionItem] : [] })
        // parallel: courseDetail + syllabusRes + brandingItem
        .mockResolvedValueOnce({ Item: { title: 'Introduction to Programming' } })
        .mockResolvedValueOnce({
            Items: hasSyllabus ? [
                syllabusMetadata,
                { ...segItem, isVisible: segVisible, sections: sectionSpecific ? ['s1'] : [] },
                blkItem,
            ] : [],
        })
        .mockResolvedValueOnce({ Item: brandingItem })
}

describe('viewer/get', () => {
    beforeEach(() => vi.resetAllMocks())

    it('returns 404 when missing path params', async () => {
        const result = await handler({ pathParameters: {} } as any) as any
        expect(result.statusCode).toBe(404)
    })

    it('returns 404 when course not found', async () => {
        // courseGsi → empty, courseScan → empty → 404
        mockSend
            .mockResolvedValueOnce({ Items: [] })
            .mockResolvedValueOnce({ Items: [] })
        const result = await handler(makeEvent('CIS-121S', '2025SS', '801SS')) as any
        expect(result.statusCode).toBe(404)
    })

    it('returns 404 when section not found', async () => {
        // courseGsi → found, termGsi → found, sectionGsi → empty, sectionScan → empty → 404
        mockSend
            .mockResolvedValueOnce({ Items: [courseItem] })
            .mockResolvedValueOnce({ Items: [termItem] })
            .mockResolvedValueOnce({ Items: [] })
            .mockResolvedValueOnce({ Items: [] })
        const result = await handler(makeEvent('CIS-121S', '2025SS', '801SS')) as any
        expect(result.statusCode).toBe(404)
    })

    it('returns 404 when section has no masterSyllabusId', async () => {
        mockSend
            .mockResolvedValueOnce({ Items: [courseItem] })
            .mockResolvedValueOnce({ Items: [termItem] })
            .mockResolvedValueOnce({ Items: [{ ...sectionItem, masterSyllabusId: undefined }] })
        const result = await handler(makeEvent('CIS-121S', '2025SS', '801SS')) as any
        expect(result.statusCode).toBe(404)
        expect(JSON.parse(result.body).error).toBe('No syllabus assigned to this section')
    })

    it('returns viewer data with isAvailable true when all segments visible', async () => {
        setupMocks()
        const result = await handler(makeEvent('CIS-121S', '2025SS', '801SS')) as any
        expect(result.statusCode).toBe(200)
        const { data } = JSON.parse(result.body)
        expect(data.isAvailable).toBe(true)
        expect(data.segments).toHaveLength(1)
        expect(data.segments[0].blocks).toHaveLength(1)
        expect(data.branding.institutionName).toBe('Edison State')
        expect(data.section.courseCode).toBe('CIS-121S')
        expect(data.section.termCode).toBe('2025SS')
        expect(data.section.sectionCode).toBe('801SS')
    })

    it('returns isAvailable false when a segment is not visible', async () => {
        setupMocks({ segVisible: false })
        const result = await handler(makeEvent('CIS-121S', '2025SS', '801SS')) as any
        const { data } = JSON.parse(result.body)
        expect(data.isAvailable).toBe(false)
    })

    it('includes section-specific segments assigned to this section', async () => {
        setupMocks({ sectionSpecific: true })
        const result = await handler(makeEvent('CIS-121S', '2025SS', '801SS')) as any
        const { data } = JSON.parse(result.body)
        expect(data.segments).toHaveLength(1)
    })

    it('returns 500 on DynamoDB error', async () => {
        mockSend.mockRejectedValueOnce(new Error('DDB error'))
        const result = await handler(makeEvent('CIS-121S', '2025SS', '801SS')) as any
        expect(result.statusCode).toBe(500)
    })
})
