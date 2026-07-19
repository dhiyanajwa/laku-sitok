import { useEffect, useRef, useState } from 'react'
import { Alert, Box, Button, Chip, CircularProgress, Drawer, IconButton, MenuItem, Paper, Select, Stack, TextField, Typography } from '@mui/material'
import { cancelManagerAction, confirmManagerAction, getManagerActions, getOrders, requestManager } from '../services/api'
import VendorIcon from './VendorIcon'

const suggestedActions = [
  { label: 'What needs my attention?', request: 'What needs my attention?' },
  { label: 'Which orders are delayed?', request: 'Which orders are delayed?' },
  { label: 'How was business today?', request: 'How was business today?' },
  { label: 'What should I restock?', request: 'What should I restock?' },
  { label: 'Restock an ingredient', prefill: 'We received 20 ' },
  { label: 'Update a kitchen order', kitchenOrder: true },
  { label: 'Why did revenue change today?', request: 'Why did revenue change today?' },
]

function renderMessageMarkdown(message) {
  return String(message || '').split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    const isBold = part.startsWith('**') && part.endsWith('**')
    return isBold ? <Box key={index} component="strong" sx={{ color: 'inherit', fontWeight: 900 }}>{part.slice(2, -2)}</Box> : part
  })
}

function actionSummary(action) {
  const payload = action.payload || {}
  if (action.actionType === 'ingredient_restock') return `Add ${payload.changeQuantity} ${payload.unit || ''} to ${payload.ingredientName || 'ingredient'}?`
  if (action.actionType === 'order_status') return `Mark ${payload.orderNumber || 'order'} as ${payload.status}?`
  return 'Manager action'
}

function ApprovalCard({ action, busyActionId, onConfirm, onCancel }) {
  const preview = action.preview || {}
  const busy = busyActionId === action.id
  const details = preview.currentQuantity !== undefined
    ? `Current: ${preview.currentQuantity} ${preview.unit} to ${preview.nextQuantity} ${preview.unit}`
    : preview.orderNumber
      ? `${preview.orderNumber}: ${preview.fromStatus} to ${preview.toStatus}`
      : ''

  return <Paper variant="outlined" sx={{ p: 2, borderColor: 'var(--ls-border)', borderRadius: 2, bgcolor: 'var(--ls-surface)' }}>
    <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ color: 'var(--ls-text)', fontSize: 15, fontWeight: 900 }}>{action.summary || actionSummary(action)}</Typography>
        {details && <Typography variant="caption" sx={{ display: 'block', mt: .45, color: 'var(--ls-text-secondary)' }}>{details}</Typography>}
        {action.failureReason && <Typography variant="caption" sx={{ display: 'block', mt: .45, color: 'error.main' }}>{action.failureReason}</Typography>}
      </Box>
      <Stack spacing={.3} alignItems="center" flexShrink={0}>
        <Button size="small" variant="contained" onClick={() => onConfirm(action.id)} disabled={busy} sx={{ minWidth: 84, borderRadius: 1.5, px: 1.5, py: .7, bgcolor: 'var(--ls-purple)', fontWeight: 900, textTransform: 'none', '&:hover': { bgcolor: '#741fca' } }}>{busy ? 'Saving...' : 'Approve'}</Button>
        <Button size="small" onClick={() => onCancel(action.id)} disabled={busy} sx={{ minWidth: 0, px: .5, color: 'var(--ls-text-muted)', fontSize: 11, textTransform: 'none' }}>Cancel</Button>
      </Stack>
    </Stack>
  </Paper>
}

function ResponseCard({ response, busyActionId, onConfirm, onCancel }) {
  const action = response.action
  const busy = action && busyActionId === action.id
  return <Paper elevation={0} sx={{ p: 1.75, border: '1px solid #e2eaf2', borderRadius: 2, bgcolor: 'var(--ls-surface)' }}>
    <Stack spacing={1}>
      <Stack direction="row" spacing={.8} alignItems="center"><Chip size="small" label={response.type === 'recommendation' ? 'AI ADVISOR' : 'MANAGER'} sx={{ height: 22, bgcolor: 'var(--ls-purple-soft)', color: 'var(--ls-purple)', fontSize: 10, fontWeight: 900 }} /><Typography sx={{ color: 'var(--ls-text)', fontWeight: 900 }}>{response.title}</Typography></Stack>
      <Typography variant="body2" sx={{ color: 'var(--ls-text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{renderMessageMarkdown(response.message)}</Typography>
      {action && <Box sx={{ mt: .25, p: 1.25, border: '1px solid #dfc6ff', borderRadius: 1.5, bgcolor: 'var(--ls-purple-soft)' }}>
        <Typography variant="caption" sx={{ display: 'block', color: 'var(--ls-purple)', fontWeight: 900 }}>READY FOR YOUR APPROVAL</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={.85} sx={{ mt: 1 }}>
          <Button size="small" variant="contained" onClick={() => onConfirm(action.id)} disabled={busy} sx={{ minHeight: 38, flex: 1, borderRadius: 1.2, bgcolor: 'var(--ls-purple)', fontWeight: 900, textTransform: 'none', '&:hover': { bgcolor: '#741fca' } }}>{busy ? 'Saving...' : 'Approve change'}</Button>
          <Button size="small" variant="outlined" onClick={() => onCancel(action.id)} disabled={busy} sx={{ minHeight: 38, flex: 1, borderRadius: 1.2, borderColor: '#d8b9ff', color: 'var(--ls-purple)', fontWeight: 900, textTransform: 'none' }}>Cancel</Button>
        </Stack>
      </Box>}
      {(response.sections || []).map((section) => <Box key={section.title}><Typography variant="caption" sx={{ color: 'var(--ls-text-muted)', fontWeight: 900, letterSpacing: .4 }}>{section.title}</Typography><Stack spacing={.5} sx={{ mt: .45 }}>{section.items.map((item, index) => <Typography key={`${item.title}-${index}`} variant="body2" sx={{ color: 'var(--ls-text-secondary)' }}><Box component="span" fontWeight={800}>{item.title}</Box>{item.description ? ` - ${item.description}` : ''}</Typography>)}</Stack></Box>)}
    </Stack>
  </Paper>
}

function ManagerDrawer({ open, onClose }) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [actions, setActions] = useState([])
  const [kitchenOrders, setKitchenOrders] = useState([])
  const [showOrderPicker, setShowOrderPicker] = useState(false)
  const [suggestedActionsOpen, setSuggestedActionsOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [busyActionId, setBusyActionId] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef(null)
  const pendingActions = actions.filter((action) => action.status === 'pending_confirmation')
  const responseActionIds = new Set(messages.filter((message) => message.role === 'manager' && message.response?.action?.id).map((message) => message.response.action.id))
  const separatePendingActions = pendingActions.filter((action) => !responseActionIds.has(action.id))

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

  function focusInput() {
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function handleSuggestedAction(action) {
    if (action.prefill) {
      setInput(action.prefill)
      setShowOrderPicker(false)
      focusInput()
      return
    }
    if (action.kitchenOrder) {
      setShowOrderPicker(true)
      return
    }
    sendRequest(action.request)
  }

  function selectKitchenOrder(orderId) {
    const order = kitchenOrders.find((item) => item.id === orderId)
    if (!order) return
    setInput(`@${order.order_number} is ready`)
    setShowOrderPicker(false)
    focusInput()
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
      setError(requestError.response?.data?.message || 'We could not approve this action.')
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

  return <Drawer anchor="right" open={open} onClose={onClose} ModalProps={{ disablePortal: true }} slotProps={{ paper: { sx: { width: { xs: '100dvw', sm: 540 }, maxWidth: '100vw', left: { xs: 0, sm: 'auto' }, height: '100dvh', boxSizing: 'border-box', p: 0, bgcolor: 'var(--ls-surface-muted)' } } }}>
    <Stack sx={{ height: '100%', minHeight: 0, bgcolor: 'var(--ls-surface-muted)' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ flexShrink: 0, minHeight: { xs: 92, sm: 109 }, px: { xs: 2.5, sm: 3.75 }, py: { xs: 1.6, sm: 2.25 }, color: '#fff', background: 'linear-gradient(112deg, #3c0a63, #69179b)' }}>
        <Stack direction="row" spacing={1.6} alignItems="center"><Box sx={{ width: 50, height: 50, display: 'grid', placeItems: 'center', border: '1px solid rgba(255,255,255,.16)', borderRadius: 1.4, bgcolor: 'rgba(255,255,255,.1)' }}><VendorIcon name="spark" size={27} /></Box><Box><Typography sx={{ fontSize: 18, fontWeight: 900 }}>Laku AI Manager</Typography><Stack direction="row" spacing={.8} alignItems="center" sx={{ mt: .45 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#2fe1a1' }} /><Typography variant="caption" sx={{ color: '#f2e7ff', letterSpacing: .45, fontWeight: 900 }}>QUEUE GUARD ACTIVE</Typography></Stack></Box></Stack>
        <Button aria-label="Close AI Manager" onClick={onClose} sx={{ minWidth: 36, width: 36, height: 36, p: 0, color: '#fff' }}><VendorIcon name="close" size={22} /></Button>
      </Stack>

      <Stack spacing={2.25} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: { xs: 2.5, sm: 3.75 }, bgcolor: 'var(--ls-surface-muted)' }}>
        {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
        {!messages.length && <Paper elevation={0} sx={{ maxWidth: '88%', p: 2.3, border: '1px solid #e7edf4', borderRadius: '0 0 22px 22px', bgcolor: 'var(--ls-surface)' }}><Typography sx={{ color: 'var(--ls-text)', lineHeight: 1.62 }}>Good day! I am your Laku AI Manager. How can I help you optimize Warung Murni today?</Typography></Paper>}
        <Box><Typography variant="caption" sx={{ color: 'var(--ls-text-muted)', fontWeight: 900, letterSpacing: .6 }}>PENDING APPROVALS</Typography>{separatePendingActions.length > 0 ? <Stack spacing={1.4} sx={{ mt: 1.35 }}>{separatePendingActions.map((action) => <ApprovalCard key={action.id} action={action} busyActionId={busyActionId} onConfirm={confirmAction} onCancel={cancelAction} />)}</Stack> : <Typography variant="body2" sx={{ mt: 1, color: 'var(--ls-text-muted)' }}>{pendingActions.length ? 'Review the proposed change in this conversation.' : 'No changes are waiting for approval.'}</Typography>}</Box>
        {messages.map((message, index) => message.role === 'vendor'
          ? <Paper key={index} elevation={0} sx={{ p: 1.5, alignSelf: 'flex-end', maxWidth: '88%', borderRadius: '16px 16px 4px 16px', bgcolor: 'var(--ls-purple)', color: '#fff' }}><Typography variant="body2">{message.message}</Typography></Paper>
          : <ResponseCard key={index} response={message.response} busyActionId={busyActionId} onConfirm={confirmAction} onCancel={cancelAction} />)}
        {loading && <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={18} sx={{ color: 'var(--ls-purple)' }} /><Typography variant="body2" color="text.secondary">Manager is checking the current business state...</Typography></Stack>}
      </Stack>

      <Box sx={{ flexShrink: 0, p: { xs: 2.5, sm: 3.75 }, borderTop: '1px solid var(--ls-border-subtle)', bgcolor: 'var(--ls-surface)' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="caption" sx={{ color: 'var(--ls-text-muted)', letterSpacing: .75, fontWeight: 900 }}>SUGGESTED ACTIONS</Typography>
          <IconButton aria-label={suggestedActionsOpen ? 'Hide suggested actions' : 'Show suggested actions'} aria-expanded={suggestedActionsOpen} onClick={() => setSuggestedActionsOpen((current) => !current)} sx={{ width: 36, height: 36, border: '1px solid #dec5ff', borderRadius: 1.25, color: 'var(--ls-purple)', bgcolor: 'var(--ls-purple-soft)', '&:hover': { bgcolor: '#f1e5ff' } }}><VendorIcon name={suggestedActionsOpen ? 'chevronUp' : 'chevronDown'} size={21} /></IconButton>
        </Stack>
        {suggestedActionsOpen && <><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1, mt: 1.15 }}>{suggestedActions.map((action) => <Button key={action.label} size="small" variant="outlined" onClick={() => handleSuggestedAction(action)} disabled={loading} sx={{ minHeight: 39, justifyContent: 'flex-start', borderColor: '#ead9ff', borderRadius: 1.25, bgcolor: 'var(--ls-purple-soft)', color: 'var(--ls-purple)', textAlign: 'left', textTransform: 'none', fontWeight: 800, lineHeight: 1.2, '&:hover': { borderColor: '#d4b1ff', bgcolor: '#f4ebff' } }}>{action.label}</Button>)}</Box>
        {showOrderPicker && <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}><Select value="" displayEmpty onChange={(event) => selectKitchenOrder(event.target.value)} size="small" fullWidth sx={{ bgcolor: 'var(--ls-surface-muted)', borderRadius: 1.5, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--ls-border)' } }}><MenuItem value="" disabled>Select an active kitchen order</MenuItem>{kitchenOrders.map((order) => <MenuItem key={order.id} value={order.id}>{order.order_number} - {order.status}</MenuItem>)}</Select><Button onClick={() => setShowOrderPicker(false)} sx={{ color: 'var(--ls-text-secondary)', textTransform: 'none' }}>Cancel</Button></Stack>}</>}
        <Stack direction="row" spacing={1.1} alignItems="center" sx={{ mt: 2.25 }}><TextField inputRef={inputRef} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendRequest() } }} placeholder="Ask any question about sales or ingredients..." inputProps={{ maxLength: 280, 'aria-label': 'Ask AI Manager' }} fullWidth disabled={loading} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, bgcolor: 'var(--ls-surface-muted)' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--ls-border)' } }} /><Button aria-label="Send message" variant="contained" onClick={() => sendRequest()} disabled={loading || !input.trim()} sx={{ minWidth: 52, width: 52, height: 52, p: 0, borderRadius: 1.5, bgcolor: 'var(--ls-purple)', '&:hover': { bgcolor: '#741fca' } }}><VendorIcon name="send" size={20} /></Button></Stack>
      </Box>
    </Stack>
  </Drawer>
}

export default ManagerDrawer
