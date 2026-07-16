import { getAnalytics } from '../agents/manager.agent.js'

export async function getOverview(request, response) {
  response.json({ data: await getAnalytics(request.vendorId) })
}
