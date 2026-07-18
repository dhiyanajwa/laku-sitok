import { cancelManagerAction, confirmManagerAction, listManagerActions } from '../services/manager-actions.service.js'
import { getOrderDelayMinutes, requestManager } from '../services/manager.service.js'

export async function postManagerRequest(request, response) {
  response.json({ data: await requestManager(request.vendorId, request.body) })
}

export async function getManagerActions(request, response) {
  response.json({ data: await listManagerActions(request.vendorId) })
}

export async function postManagerActionConfirmation(request, response) {
  response.json({ data: await confirmManagerAction(request.params.id, request.vendorId) })
}

export async function postManagerActionCancellation(request, response) {
  response.json({ data: await cancelManagerAction(request.params.id, request.vendorId) })
}

export async function getManagerContext(_request, response) {
  response.json({ data: { orderDelayMinutes: getOrderDelayMinutes() } })
}