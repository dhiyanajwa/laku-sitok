import { useEffect, useState } from 'react'
import { Alert, Box, Button, Chip, Paper, Stack, Typography } from '@mui/material'
import { getOrders, updateOrderStatus } from '../../services/api'

const actionsByStatus = {
  pending: [{ status: 'preparing', label: 'Start preparing' }, { status: 'cancelled', label: 'Cancel', color: 'error' }],
  preparing: [{ status: 'ready', label: 'Mark ready' }, { status: 'cancelled', label: 'Cancel', color: 'error' }],
  ready: [{ status: 'completed', label: 'Complete order' }],
  completed: [],
  cancelled: [],
}

function VendorOrdersPage() {
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')
  const [updatingOrderId, setUpdatingOrderId] = useState('')

  const loadOrders = () => getOrders().then(({ data }) => setOrders(data.data)).catch(() => setError('We could not load orders.'))
  useEffect(() => { loadOrders() }, [])

  async function changeStatus(orderId, status) {
    setUpdatingOrderId(orderId)
    setError('')
    try {
      await updateOrderStatus(orderId, status)
      loadOrders()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We could not update this order.')
    } finally {
      setUpdatingOrderId('')
    }
  }

  return <Stack spacing={3}>
    <Box><Typography variant="h4" fontWeight={900}>Orders</Typography><Typography color="text.secondary">Review customer orders and move them safely through the kitchen workflow.</Typography></Box>
    {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
    {orders.map((order) => <Paper key={order.id} sx={{ p: 2.5 }}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}><Box><Typography fontWeight={900}>{order.order_number}</Typography><Typography color="text.secondary">{order.customer_name || 'Walk-in customer'} · RM {Number(order.total_amount).toFixed(2)}</Typography><Typography variant="body2" sx={{ mt: 1 }}>{order.order_items.map((item) => `${item.quantity}× ${item.product_name}`).join(', ')}</Typography></Box><Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap"><Chip label={order.status} size="small" />{(actionsByStatus[order.status] || []).map((action) => <Button key={action.status} size="small" variant={action.color ? 'outlined' : 'contained'} color={action.color || 'primary'} onClick={() => changeStatus(order.id, action.status)} disabled={updatingOrderId === order.id}>{updatingOrderId === order.id ? 'Updating…' : action.label}</Button>)}</Stack></Stack></Paper>)}
  </Stack>
}

export default VendorOrdersPage