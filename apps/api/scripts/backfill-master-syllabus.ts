/**
 * One-time backfill: set section.masterSyllabusId from existing SEG# section links.
 *
 * Usage (from apps/api):
 *   DYNAMODB_TABLE=syllabee-dev AWS_REGION=us-east-1 npx tsx scripts/backfill-master-syllabus.ts
 */
import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { dynamo, TABLE_NAME } from '../functions/shared/db'
import { syncAfterSegmentSectionsChange } from '../functions/shared/sync-section-syllabus'

async function main() {
    const syllabi = new Map<string, { termCode?: string | null; segments: { sections: string[] }[] }>()
    let lastKey: Record<string, unknown> | undefined

    do {
        const res = await dynamo.send(new ScanCommand({
            TableName: TABLE_NAME,
            FilterExpression: 'begins_with(pk, :prefix) AND (sk = :meta OR begins_with(sk, :seg))',
            ExpressionAttributeValues: {
                ':prefix': 'SYLLABUS#',
                ':meta': 'METADATA',
                ':seg': 'SEG#',
            },
            ExclusiveStartKey: lastKey,
        }))
        for (const item of res.Items ?? []) {
            const pk = item.pk as string
            const syllabusId = pk.replace('SYLLABUS#', '')
            if (!syllabi.has(syllabusId)) {
                syllabi.set(syllabusId, { termCode: null, segments: [] })
            }
            const entry = syllabi.get(syllabusId)!
            if (item.sk === 'METADATA') {
                entry.termCode = item.termCode as string | null | undefined
            } else if ((item.sk as string).startsWith('SEG#')) {
                entry.segments.push({ sections: (item.sections as string[]) ?? [] })
            }
        }
        lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined
    } while (lastKey)

    let count = 0
    for (const [syllabusId, { termCode, segments }] of syllabi) {
        for (const seg of segments) {
            await syncAfterSegmentSectionsChange({
                syllabusId,
                termCode,
                newSections: seg.sections,
            })
            count++
        }
    }
    console.log(`Backfill complete: synced ${count} segment(s) across ${syllabi.size} syllabus(es).`)
}

main().catch(err => {
    console.error(err)
    process.exit(1)
})
