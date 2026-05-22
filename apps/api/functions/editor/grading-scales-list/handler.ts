import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { toApiGatewayResponse, ok, serverError } from '../../shared/response'

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        const params: any = {
            TableName: TABLE_NAME,
            FilterExpression: 'begins_with(pk, :prefix)',
            ExpressionAttributeValues: { ':prefix': 'GRADESCALE#' },
        }

        const items: any[] = []
        let lastKey: Record<string, unknown> | undefined

        do {
            if (lastKey) params.ExclusiveStartKey = lastKey
            const res = await dynamo.send(new ScanCommand(params))
            items.push(...(res.Items ?? []))
            lastKey = res.LastEvaluatedKey
        } while (lastKey)

        // Group: METADATA items become scale records; GRADE# items attach as grades[]
        const scalesMap = new Map<string, any>()
        for (const item of items) {
            if (item.sk === 'METADATA') {
                scalesMap.set(item.pk, { ...item, grades: scalesMap.get(item.pk)?.grades ?? [] })
            } else if (item.sk.startsWith('GRADE#')) {
                const existing = scalesMap.get(item.pk)
                const grade = { id: item.id, scaleId: item.scaleId, letter: item.letter, minPercent: item.minPercent, maxPercent: item.maxPercent }
                if (existing) {
                    existing.grades.push(grade)
                } else {
                    scalesMap.set(item.pk, { grades: [grade] })
                }
            }
        }

        const scales = Array.from(scalesMap.values()).filter(s => s.sk === 'METADATA')

        return toApiGatewayResponse(ok(scales))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
