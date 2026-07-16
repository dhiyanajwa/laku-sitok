import { listAgentActivity } from '../agents/activity.agent.js'

export async function getAgentActivity(request, response) {
  response.json({ data: listAgentActivity(request.vendorId) })
}
