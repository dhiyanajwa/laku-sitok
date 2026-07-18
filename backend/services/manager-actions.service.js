import supabase from '../config/supabase.js'
import { restockIngredient } from '../agents/inventory.agent.js'
import { updateKitchenOrderStatus } from '../agents/kitchen.agent.js'
import { recordAgentActivity } from '../agents/activity.agent.js'
import { appError } from '../utils/app-error.js'

const ACTION_EXPIRY_MS = 10 * 60 * 1000

function isMissingActionsTable(error) {
  return error?.code === 'PGRST205' || /manager_actions/i.test(error?.message || '') && /schema cache|does not exist/i.test(error?.message || '')
}

function actionTableError(error) {
  if (isMissingActionsTable(error)) return appError('Manager actions are not ready yet. Run database/manager-actions.sql in Supabase first.', 503)
  return error
}

function actionView(action) {
  return {
    id: action.id,
    originalRequest: action.original_request,
    actionType: action.action_type,
    payload: action.payload,
    status: action.status,
    expiresAt: action.expires_at,
    confirmedAt: action.confirmed_at,
    completedAt: action.completed_at,
    result: action.result,
    failureReason: action.failure_reason,
    createdAt: action.created_at,
  }
}

export async function createManagerAction(vendorId, { originalRequest, actionType, payload }) {
  const expiresAt = new Date(Date.now() + ACTION_EXPIRY_MS).toISOString()
  const { data, error } = await supabase
    .from('manager_actions')
    .insert({
      vendor_id: vendorId,
      original_request: originalRequest,
      action_type: actionType,
      payload,
      expires_at: expiresAt,
    })
    .select()
    .single()

  if (error) throw actionTableError(error)
  recordAgentActivity(vendorId, { agent: 'Manager Agent', title: 'Action waiting for confirmation', detail: actionType === 'ingredient_restock' ? 'A restock proposal was prepared.' : 'A kitchen-status proposal was prepared.' })
  return actionView(data)
}

async function loadAction(actionId, vendorId) {
  const { data, error } = await supabase
    .from('manager_actions')
    .select()
    .eq('id', actionId)
    .eq('vendor_id', vendorId)
    .single()

  if (error?.code === 'PGRST116') throw appError('Manager action not found.', 404)
  if (error) throw actionTableError(error)
  return data
}

async function expireAction(action) {
  const { data, error } = await supabase
    .from('manager_actions')
    .update({ status: 'expired' })
    .eq('id', action.id)
    .eq('vendor_id', action.vendor_id)
    .eq('status', 'pending_confirmation')
    .select()
    .single()
  if (error) throw actionTableError(error)
  return actionView(data)
}

export async function listManagerActions(vendorId) {
  const now = new Date().toISOString()
  const { error: expireError } = await supabase
    .from('manager_actions')
    .update({ status: 'expired' })
    .eq('vendor_id', vendorId)
    .eq('status', 'pending_confirmation')
    .lt('expires_at', now)
  if (expireError) throw actionTableError(expireError)

  const { data, error } = await supabase
    .from('manager_actions')
    .select()
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw actionTableError(error)
  return (data || []).map(actionView)
}

export async function cancelManagerAction(actionId, vendorId) {
  const action = await loadAction(actionId, vendorId)
  if (action.status !== 'pending_confirmation') throw appError('This action is no longer waiting for confirmation.', 409)
  if (new Date(action.expires_at) <= new Date()) {
    await expireAction(action)
    throw appError('This action has expired. Create a new proposal.', 409)
  }

  const { data, error } = await supabase
    .from('manager_actions')
    .update({ status: 'cancelled' })
    .eq('id', actionId)
    .eq('vendor_id', vendorId)
    .eq('status', 'pending_confirmation')
    .select()
    .single()
  if (error?.code === 'PGRST116') throw appError('This action changed in another session. Refresh and try again.', 409)
  if (error) throw actionTableError(error)

  recordAgentActivity(vendorId, { agent: 'Manager Agent', title: 'Proposed action cancelled', detail: 'The vendor cancelled a pending Manager action.' })
  return actionView(data)
}

async function reserveAction(action, vendorId) {
  const { data, error } = await supabase
    .from('manager_actions')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', action.id)
    .eq('vendor_id', vendorId)
    .eq('status', 'pending_confirmation')
    .select()
    .single()
  if (error?.code === 'PGRST116') throw appError('This action changed in another session. Refresh and try again.', 409)
  if (error) throw actionTableError(error)
  return data
}

async function executeAction(action, vendorId) {
  if (action.action_type === 'ingredient_restock') {
    const quantity = Number(action.payload?.changeQuantity)
    if (!action.payload?.ingredientId || !Number.isFinite(quantity) || quantity <= 0) throw appError('This restock proposal is invalid.', 409)
    return restockIngredient(action.payload.ingredientId, vendorId, quantity)
  }
  if (action.action_type === 'order_status') {
    if (!action.payload?.orderId || !action.payload?.status) throw appError('This order-status proposal is invalid.', 409)
    return updateKitchenOrderStatus(action.payload.orderId, vendorId, action.payload.status)
  }
  throw appError('This Manager action type is not supported.', 409)
}

export async function confirmManagerAction(actionId, vendorId) {
  const action = await loadAction(actionId, vendorId)
  if (action.status !== 'pending_confirmation') throw appError('This action is no longer waiting for confirmation.', 409)
  if (new Date(action.expires_at) <= new Date()) {
    await expireAction(action)
    throw appError('This action has expired. Create a new proposal.', 409)
  }

  const reserved = await reserveAction(action, vendorId)
  try {
    const result = await executeAction(reserved, vendorId)
    const { data, error } = await supabase
      .from('manager_actions')
      .update({ status: 'completed', completed_at: new Date().toISOString(), result, failure_reason: null })
      .eq('id', reserved.id)
      .eq('vendor_id', vendorId)
      .select()
      .single()
    if (error) throw actionTableError(error)

    recordAgentActivity(vendorId, { agent: 'Manager Agent', title: 'Confirmed action completed', detail: reserved.action_type === 'ingredient_restock' ? 'Ingredient stock was restocked.' : 'Kitchen order status was updated.' })
    return actionView(data)
  } catch (error) {
    const failureReason = error.statusCode ? error.message : 'The requested action could not be completed.'
    const { error: updateError } = await supabase
      .from('manager_actions')
      .update({ status: 'failed', completed_at: new Date().toISOString(), failure_reason: failureReason })
      .eq('id', reserved.id)
      .eq('vendor_id', vendorId)
    if (updateError) console.error(updateError)
    recordAgentActivity(vendorId, { agent: 'Manager Agent', title: 'Confirmed action failed', detail: failureReason })
    throw error.statusCode ? error : appError(failureReason, 503)
  }
}