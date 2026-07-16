import { askBusinessAdvisor } from '../agents/manager.agent.js'

export async function postAdvisorQuestion(request, response) {
  response.json({ data: await askBusinessAdvisor(request.vendorId, request.body) })
}
