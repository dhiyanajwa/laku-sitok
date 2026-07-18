import { useEffect, useRef, useState } from 'react'
import { Alert, Box, Button, Chip, CircularProgress, Divider, Drawer, Paper, Stack, TextField, Typography } from '@mui/material'
import { cancelManagerAction, confirmManagerAction, getManagerActions, getOrders, requestManager } from '../services/api'

const prompts = [
  'What needs my attention?',
  'Which orders are delayed?',
  'We received 20 Burger buns.',
  'How did we do today?',
]

function actionSummary(action) {
  const payload = action.payload || {}
  if (action.actionType === 'ingredient_restock') return `Add ${payload.changeQuantity} ${payload.unit || ''} to ${payload.ingredientName || 'ingredient'}?`
  if (action.actionType === 'order_status') return `Mark ${payload.orderNumber || 'order'} as ${payload.status}?`
  return 'Manager action'
}

function statusColor(status) {
  if (status === 'completed') return 'success'
  if (status === 'failed') return 'error'
  if (status === 'pending_confirmation') return 'warning'
  return 'default'
}

function ActionCard({ action, busyActionId, onConfirm, onCancel }) {
  const pending = action.status === 'pending_confirmation'
  const preview = action.preview || {}
  return <Paper variant="outlined" sx={{ p: 1.5, borderColor: pending ? 'warning.main' : 'divider' }}>
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between"><Typography fontWeight={800}>{action.summary || actionSummary(action)}</Typography><Chip size="small" label={action.status?.replaceAll('_', ' ') || 'proposal'} color={statusColor(action.status)} /></Stack>
      {preview.currentQuantity !== undefined && <Typography variant="body2" color="text.secondary">Current: {preview.currentQuantity} {preview.unit} → New: {preview.nextQuantity} {preview.unit}</Typography>}
      {preview.orderNumber && <Typography variant="body2" color="text.secondary">{preview.orderNumber}: {preview.fromStatus} → {preview.toStatus}</Typography>}
      {action.failureReason && <Alert severity="error">{action.failureReason}</Alert>}
      {pending && <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}><Button size="small" variant="contained" onClick={() => onConfirm(action.id)} disabled={busyActionId === action.id}>{busyActionId === action.id ? 'Confirming…' : 'Confirm'}</Button><Button size="small" onClick={() => onCancel(action.id)} disabled={busyActionId === action.id}>Cancel</Button></Stack>}
    </Stack>
  </Paper>
}

function ResponseCard({ response, busyActionId, onConfirm, onCancel }) {
  return <Paper sx={{ p: 1.75, bgcolor: response.type === 'recommendation' ? 'secondary.50' : 'background.paper' }}>
    <Stack spacing={1.25}>
      <Stack direction="row" spacing={1} alignItems="center"><Chip size="small" label={response.type === 'proposed_action' ? 'Confirmation needed' : response.type === 'recommendation' ? 'Recommendation' : 'Manager'} color={response.type === 'proposed_action' ? 'warning' : response.type === 'recommendation' ? 'secondary' : 'primary'} /><Typography fontWeight={800}>{response.title}</Typography></Stack>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{response.message}</Typography>
      {response.action && <ActionCard action={response.action} busyActionId={busyActionId} onConfirm={onConfirm} onCancel={onCancel} />}
      {(response.sections || []).map((section) => <Box key={section.title}><Typography variant="caption" fontWeight={800} color="text.secondary">{section.title}</Typography><Stack spacing={0.5} sx={{ mt: 0.5 }}>{section.items.map((item, index) => <Typography key={`${item.title}-${index}`} variant="body2"><Box component="span" fontWeight={700}>{item.title}</Box>{item.description ? ` — ${item.description}` : ''}</Typography>)}</Stack></Box>)}
    </Stack>
  </Paper>
}

function ManagerDrawer({ open, onClose }) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [actions, setActions] = useState([])
  const [kitchenOrders, setKitchenOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [busyActionId, setBusyActionId] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  async function loadActions() {
    try {
      const { data } = await getManagerActions()
      setActions(data.data)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We could not load Manager action history.')
    }
  }

  async function loadKitchenOrders() {
    try {
      const { data } = await getOrders()
      setKitchenOrders(data.data.filter((order) => ['pending', 'preparing', 'ready'].includes(order.status)))
    } catch {
      setError('We could not load active kitchen orders.')
    }
  }

  useEffect(() => { if (open) { loadActions(); loadKitchenOrders() } }, [open])

  function mentionOrder(order) {
    setInput((current) => `${current.trimEnd()}${current.trim() ? ' ' : ''}@${order.order_number} `)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  async function sendRequest(message = input) {
    const request = message.trim()
    if (!request || loading) return
    setLoading(true)
    setError('')
    setInput('')
    setMessages((current) => [...current, { role: 'vendor', message: request }])
    try {
      const { data } = await requestManager(request)
      setMessages((current) => [...current, { role: 'manager', response: data.data }])
      if (data.data.type === 'proposed_action') await loadActions()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The Manager could not process that request.')
    } finally {
      setLoading(false)
    }
  }

  async function confirmAction(actionId) {
    setBusyActionId(actionId)
    setError('')
    try {
      const { data } = await confirmManagerAction(actionId)
      setMessages((current) => [...current, { role: 'manager', response: { type: 'information', title: 'Action completed', message: `${actionSummary(data.data)} Completed successfully.`, sections: [] } }])
      await loadActions()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We could not confirm this action.')
      await loadActions()
    } finally {
      setBusyActionId('')
    }
  }

  async function cancelAction(actionId) {
    setBusyActionId(actionId)
    setError('')
    try {
      await cancelManagerAction(actionId)
      setMessages((current) => [...current, { role: 'manager', response: { type: 'information', title: 'Action cancelled', message: 'The proposed action was cancelled. Nothing was changed.', sections: [] } }])
      await loadActions()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We could not cancel this action.')
    } finally {
      setBusyActionId('')
    }
  }

  return <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 500 }, p: 2.5 } }}>
    <Stack spacing={2} sx={{ height: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="start"><Box><Typography variant="h5" fontWeight={900}>Ask Manager</Typography><Typography variant="body2" color="text.secondary">Review operations and confirm any change before it is saved.</Typography></Box><Button size="small" onClick={onClose}>Close</Button></Stack>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      <Stack direction="row" flexWrap="wrap" gap={1}>{prompts.map((prompt) => <Button key={prompt} size="small" variant="outlined" onClick={() => sendRequest(prompt)} disabled={loading}>{prompt}</Button>)}</Stack>
      {kitchenOrders.length > 0 && <Paper variant="outlined" sx={{ p: 1.5 }}><Stack spacing={1}><Box><Typography variant="subtitle2" fontWeight={800}>Mention a kitchen order</Typography><Typography variant="caption" color="text.secondary">Click an order to add its @mention to your message, then type a status such as “is ready”.</Typography></Box><Stack spacing={1}>{kitchenOrders.slice(0, 8).map((order) => <Box key={order.id}><Chip label={`@${order.order_number}`} color="primary" variant="outlined" onClick={() => mentionOrder(order)} /><Typography variant="body2" sx={{ mt: 0.5 }}>{order.status} — {(order.order_items || []).map((item) => `${item.quantity}× ${item.product_name}`).join(', ') || 'No items'}</Typography></Box>)}</Stack></Stack></Paper>}
      <Divider />
      <Stack spacing={1.25} sx={{ flex: 1, overflowY: 'auto', pr: 0.5 }}>
        {!messages.length && <Alert severity="info">Start with one of the suggested prompts. For a restock, use a quantity and exact ingredient name.</Alert>}
        {messages.map((message, index) => message.role === 'vendor'
          ? <Paper key={index} sx={{ p: 1.25, alignSelf: 'flex-end', maxWidth: '90%', bgcolor: 'primary.light', color: 'primary.contrastText' }}><Typography variant="body2">{message.message}</Typography></Paper>
          : <ResponseCard key={index} response={message.response} busyActionId={busyActionId} onConfirm={confirmAction} onCancel={cancelAction} />)}
        {loading && <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={18} /><Typography variant="body2">Manager is checking the current business state…</Typography></Stack>}
      </Stack>
      {actions.length > 0 && <Box><Divider sx={{ mb: 1.5 }} /><Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>Recent Manager actions</Typography><Stack spacing={1}>{actions.slice(0, 4).map((action) => <ActionCard key={action.id} action={action} busyActionId={busyActionId} onConfirm={confirmAction} onCancel={cancelAction} />)}</Stack></Box>}
      <Stack direction="row" spacing={1}><TextField inputRef={inputRef} label="Ask about operations" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendRequest() } }} inputProps={{ maxLength: 280 }} fullWidth disabled={loading} /><Button variant="contained" onClick={() => sendRequest()} disabled={loading || !input.trim()}>Send</Button></Stack>
    </Stack>
  </Drawer>
}

export default ManagerDrawer