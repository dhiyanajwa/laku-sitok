import { useEffect, useState } from 'react'
import { Alert, Box, MenuItem, Paper, Select, Stack, Typography } from '@mui/material'
import { getOrders, updateOrderStatus } from '../../services/api'

const statuses = ['pending', 'preparing', 'ready', 'completed', 'cancelled']

function VendorOrdersPage() {
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')

  const loadOrders = () => getOrders().then(({ data }) => setOrders(data.data)).catch(() => setError('We could not load orders.'))
  useEffect(() => { loadOrders() }, [])

  async function changeStatus(orderId, status) {
    try {
      await updateOrderStatus(orderId, status)
      loadOrders()
    } catch {
      setError('We could not update this order.')
    }
  }

  return <Stack spacing={3}>
    <Box><Typography variant="h4" fontWeight={900}>Orders</Typography><Typography color="text.secondary">Review and update customer orders.</Typography></Box>
    {error && <Alert severity="error">{error}</Alert>}
    {orders.map((order) => <Paper key={order.id} sx={{ p: 2.5 }}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}><Box><Typography fontWeight={900}>{order.order_number}</Typography><Typography color="text.secondary">{order.customer_name || 'Walk-in customer'} · RM {Number(order.total_amount).toFixed(2)}</Typography><Typography variant="body2" sx={{ mt: 1 }}>{order.order_items.map((item) => `${item.quantity}× ${item.product_name}`).join(', ')}</Typography></Box><Select value={order.status} onChange={(event) => changeStatus(order.id, event.target.value)} size="small">{statuses.map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}</Select></Stack></Paper>)}
  </Stack>
}

export default VendorOrdersPage
