import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { toApiGatewayResponse, ok, serverError } from '../../shared/response'

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        const items: any[] = []
        let lastKey: Record<string, any> | undefined

        do {
            const res = await dynamo.send(new ScanCommand({
                TableName: TABLE_NAME,
                FilterExpression: 'begins_with(pk, :prefix) AND sk = :sk',
                ExpressionAttributeValues: { ':prefix': 'INTERNSHIP#', ':sk': 'METADATA' },
                ExclusiveStartKey: lastKey,
            }))
            items.push(...(res.Items ?? []))
            lastKey = res.LastEvaluatedKey
        } while (lastKey)

        const internships = items.map(item => ({
            id: item.id,
            studentId: item.studentId,
            studentName: item.studentName,
            studentEmail: item.studentEmail,
            sectionId: item.sectionId ?? null,
            status: item.status,
            startDate: item.startDate ?? null,
            endDate: item.endDate ?? null,
            completedHours: item.completedHours ?? 0,
            createdAt: item.createdAt,
            createdBy: item.createdBy,
        }))

        return toApiGatewayResponse(ok(internships))
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
