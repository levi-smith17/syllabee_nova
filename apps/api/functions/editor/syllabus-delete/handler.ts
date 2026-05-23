import { QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { dynamo, TABLE_NAME } from '../../shared/db'
import { getUserId, isAdmin, getPathId } from '../../shared/auth'
import { toApiGatewayResponse, noContent, forbidden, notFound, conflict, serverError } from '../../shared/response'
import { clearMasterSyllabusForSyllabus } from '../../shared/sync-section-syllabus'

export const handler = async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
    try {
        const id = getPathId(event)
        if (!id) return toApiGatewayResponse(notFound('Syllabus not found'))

        const userId = getUserId(event)

        const res = await dynamo.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'pk = :pk',
            ExpressionAttributeValues: { ':pk': `SYLLABUS#${id}` },
        }))

        const items = res.Items ?? []
        const metadata = items.find(i => i.sk === 'METADATA')
        if (!metadata) return toApiGatewayResponse(notFound('Syllabus not found'))
        if (metadata.ownerId !== userId && !await isAdmin(event)) {
            return toApiGatewayResponse(forbidden())
        }
        if (metadata.locked) return toApiGatewayResponse(conflict('Syllabus is locked'))

        await clearMasterSyllabusForSyllabus(id)

        await Promise.all(items.map(item =>
            dynamo.send(new DeleteCommand({
                TableName: TABLE_NAME,
                Key: { pk: item.pk, sk: item.sk },
            }))
        ))

        return toApiGatewayResponse(noContent())
    } catch (err) {
        console.error(err)
        return toApiGatewayResponse(serverError())
    }
}
