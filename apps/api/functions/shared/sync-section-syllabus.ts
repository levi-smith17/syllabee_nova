import {
    GetCommand,
    QueryCommand,
    ScanCommand,
    UpdateCommand,
} from '@aws-sdk/lib-dynamodb'
import { dynamo, TABLE_NAME } from './db'

export class MasterSyllabusConflictError extends Error {
    constructor(message = 'Section is already assigned to another syllabus') {
        super(message)
        this.name = 'MasterSyllabusConflictError'
    }
}

export type SyllabusSegmentRow = {
    sk: string
    sections?: string[]
}

function normalizeSectionIds(sections: string[] | undefined): string[] {
    return sections ?? []
}

function isGlobalSegment(sections: string[] | undefined): boolean {
    return normalizeSectionIds(sections).length === 0
}

export function isSectionLinkedBySegments(
    segments: SyllabusSegmentRow[],
    sectionId: string
): boolean {
    return segments.some(seg => {
        const ids = normalizeSectionIds(seg.sections)
        return ids.length === 0 || ids.includes(sectionId)
    })
}

export async function loadSyllabusSegments(syllabusId: string): Promise<SyllabusSegmentRow[]> {
    const res = await dynamo.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':pk': `SYLLABUS#${syllabusId}`, ':prefix': 'SEG#' },
        ProjectionExpression: 'sk, sections',
    }))
    return (res.Items ?? []) as SyllabusSegmentRow[]
}

async function resolveTermId(termCode: string): Promise<string | undefined> {
    const upper = termCode.toUpperCase()
    const gsi = await dynamo.send(new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'gsi1',
        KeyConditionExpression: 'gsi1pk = :g1pk AND gsi1sk = :g1sk',
        ExpressionAttributeValues: { ':g1pk': 'TYPE#TERM', ':g1sk': upper },
        ProjectionExpression: 'pk',
        Limit: 1,
    }))
    if (gsi.Items?.length) {
        return (gsi.Items[0].pk as string).replace('TERM#', '')
    }
    const scan = await dynamo.send(new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'begins_with(pk, :prefix) AND sk = :sk AND #code = :code',
        ExpressionAttributeNames: { '#code': 'code' },
        ExpressionAttributeValues: { ':prefix': 'TERM#', ':sk': 'METADATA', ':code': upper },
        ProjectionExpression: 'pk',
    }))
    const pk = scan.Items?.[0]?.pk as string | undefined
    return pk?.replace('TERM#', '')
}

export async function getActiveSectionIdsForTerm(termCode: string): Promise<string[]> {
    const termId = await resolveTermId(termCode)
    if (!termId) return []

    const ids: string[] = []
    let lastKey: Record<string, unknown> | undefined
    do {
        const res = await dynamo.send(new ScanCommand({
            TableName: TABLE_NAME,
            FilterExpression: 'begins_with(pk, :prefix) AND sk = :sk AND termId = :tid AND isActive = :active',
            ExpressionAttributeValues: {
                ':prefix': 'SECTION#',
                ':sk': 'METADATA',
                ':tid': termId,
                ':active': true,
            },
            ProjectionExpression: 'pk',
            ExclusiveStartKey: lastKey,
        }))
        for (const item of res.Items ?? []) {
            ids.push((item.pk as string).replace('SECTION#', ''))
        }
        lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined
    } while (lastKey)
    return ids
}

async function expandSectionIds(
    termCode: string | null | undefined,
    sectionIds: string[]
): Promise<string[]> {
    if (isGlobalSegment(sectionIds) && termCode) {
        return getActiveSectionIdsForTerm(termCode)
    }
    return sectionIds
}

async function setMasterSyllabusOnSection(syllabusId: string, sectionId: string): Promise<void> {
    const key = { pk: `SECTION#${sectionId}`, sk: 'METADATA' }
    const existing = await dynamo.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: key,
        ProjectionExpression: 'masterSyllabusId',
    }))
    const current = existing.Item?.masterSyllabusId as string | undefined
    if (current && current !== syllabusId) {
        throw new MasterSyllabusConflictError()
    }
    if (current === syllabusId) return

    await dynamo.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: key,
        UpdateExpression: 'SET masterSyllabusId = :sid',
        ExpressionAttributeValues: { ':sid': syllabusId },
    }))
}

async function clearMasterSyllabusOnSection(syllabusId: string, sectionId: string): Promise<void> {
    const key = { pk: `SECTION#${sectionId}`, sk: 'METADATA' }
    const existing = await dynamo.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: key,
        ProjectionExpression: 'masterSyllabusId',
    }))
    if (existing.Item?.masterSyllabusId !== syllabusId) return

    await dynamo.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: key,
        UpdateExpression: 'REMOVE masterSyllabusId',
    }))
}

export async function recomputeSectionLink(
    syllabusId: string,
    sectionId: string,
    segments: SyllabusSegmentRow[]
): Promise<void> {
    if (isSectionLinkedBySegments(segments, sectionId)) {
        await setMasterSyllabusOnSection(syllabusId, sectionId)
    } else {
        await clearMasterSyllabusOnSection(syllabusId, sectionId)
    }
}

export async function syncAfterSegmentSectionsChange(opts: {
    syllabusId: string
    termCode?: string | null
    newSections: string[]
    previousSections?: string[]
}): Promise<void> {
    const tc = opts.termCode ?? undefined
    const newExpanded = await expandSectionIds(tc, opts.newSections)
    const oldExpanded = opts.previousSections !== undefined
        ? await expandSectionIds(tc, opts.previousSections)
        : []
    const affected = [...new Set([...newExpanded, ...oldExpanded])]
    if (affected.length === 0) return

    const segments = await loadSyllabusSegments(opts.syllabusId)
    await Promise.all(affected.map(sid =>
        recomputeSectionLink(opts.syllabusId, sid, segments)
    ))
}

export async function syncAfterSegmentDelete(opts: {
    syllabusId: string
    termCode?: string | null
    deletedSections: string[]
}): Promise<void> {
    const affected = await expandSectionIds(opts.termCode ?? undefined, opts.deletedSections)
    if (affected.length === 0) return

    const segments = await loadSyllabusSegments(opts.syllabusId)
    await Promise.all(affected.map(sid =>
        recomputeSectionLink(opts.syllabusId, sid, segments)
    ))
}

export async function clearMasterSyllabusForSyllabus(syllabusId: string): Promise<void> {
    let lastKey: Record<string, unknown> | undefined
    do {
        const res = await dynamo.send(new ScanCommand({
            TableName: TABLE_NAME,
            FilterExpression: 'begins_with(pk, :prefix) AND sk = :sk AND masterSyllabusId = :sid',
            ExpressionAttributeValues: {
                ':prefix': 'SECTION#',
                ':sk': 'METADATA',
                ':sid': syllabusId,
            },
            ProjectionExpression: 'pk',
            ExclusiveStartKey: lastKey,
        }))
        await Promise.all((res.Items ?? []).map(item =>
            dynamo.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { pk: item.pk as string, sk: 'METADATA' },
                UpdateExpression: 'REMOVE masterSyllabusId',
            }))
        ))
        lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined
    } while (lastKey)
}
