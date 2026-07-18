import { useEffect, useState } from 'react'
import { Alert, Button, Grid, Paper, Stack, Typography } from '@mui/material'
import { getManagerContext, getOrders, updateOrderStatus } from '../../services/api'

const columns = [['pending', 'Pending', 'preparing', 'Start preparing'], ['preparing', 'Preparing', 'ready', 'Mark ready'], ['ready', 'Ready', 'completed', 'Complete']]
const cancellableStatuses = new Set(['pending', 'preparing'])
const DEFAULT_PREPARATION_MINUTES = 15

function elapsedMinutes(createdAt, now) { return Math.max(0, Math.floor((now - new Date(createdAt)) / 60000)) }

function KitchenPage() {
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [now, setNow] = useState(Date.now())
  const [updatingOrderId, setUpdatingOrderId] = useState('')
  const [delayMinutes, setDelayMinutes] = useState(DEFAULT_PREPARATION_MINUTES)
  const loadOrders = () => getOrders().then(({ data }) => setOrders(data.data)).catch(() => setError('We could not load the kitchen queue.'))

  useEffect(() => {
    loadOrders()
    getManagerContext().then(({ data }) => setDelayMinutes(data.data.orderDelayMinutes)).catch(() => {})
    const timer = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [])

  async function moveOrder(orderId, status) {
    setUpdatingOrderId(orderId)
    setError('')
    try {
      const { data } = await updateOrderStatus(orderId, status)
      if (status === 'ready') setNotice(`${data.data.order_number} is ready for pickup.`)
      if (status === 'completed') setNotice(`${data.data.order_number} was completed and stock was deducted.`)
      if (status === 'cancelled') setNotice(`${data.data.order_number} was cancelled. No stock was deducted.`)
      loadOrders()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We could not update this order.')
    } finally {
      setUpdatingOrderId('')
    }
  }

  return <Stack spacing={3}>
    <Stack spacing={0.5}><Typography variant="h4" fontWeight={900}>Kitchen queue</Typography><Typography color="text.secondary">Move orders through preparation. Orders waiting {delayMinutes} minutes are highlighted. Stock changes only when an order is completed.</Typography></Stack>
    {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}{notice && <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert>}
    <Grid container spacing={2}>{columns.map(([status, title, nextStatus, action]) => <Grid key={status} size={{ xs: 12, md: 4 }}><Stack spacing={1.5}><Typography fontWeight={800}>{title}</Typography>{orders.filter((order) => order.status === status).map((order) => {
      const minutes = elapsedMinutes(order.created_at, now); const delayed = minutes >= delayMinutes
      return <Paper key={order.id} sx={{ p: 2, border: delayed ? 2 : 0, borderColor: 'warning.main' }}><Typography fontWeight={800}>{order.order_number}</Typography><Typography variant="body2" color="text.secondary">{order.customer_name || 'Walk-in customer'}</Typography><Typography variant="body2" sx={{ my: 1 }}>{order.order_items.map((item) => `${item.quantity}× ${item.product_name}`).join(', ')}</Typography><Typography variant="caption" color={delayed ? 'warning.main' : 'text.secondary'}>{minutes} min waiting{delayed ? ' — longer than expected' : ''}</Typography><Stack direction="row" spacing={1} sx={{ mt: 1 }}><Button size="small" variant="contained" onClick={() => moveOrder(order.id, nextStatus)} disabled={updatingOrderId === order.id}>{updatingOrderId === order.id ? 'Updating…' : action}</Button>{cancellableStatuses.has(order.status) && <Button size="small" color="error" onClick={() => moveOrder(order.id, 'cancelled')} disabled={updatingOrderId === order.id}>Cancel</Button>}</Stack></Paper>
    })}</Stack></Grid>)}</Grid>
  </Stack>
}

export default KitchenPage