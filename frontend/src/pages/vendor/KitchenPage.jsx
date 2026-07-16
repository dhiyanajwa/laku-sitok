import { useEffect, useState } from 'react'
import { Alert, Button, Grid, Paper, Stack, Typography } from '@mui/material'
import { getOrders, updateOrderStatus } from '../../services/api'

const columns = [
  ['pending', 'Pending', 'preparing', 'Start preparing'],
  ['preparing', 'Preparing', 'ready', 'Mark ready'],
  ['ready', 'Ready', 'completed', 'Complete'],
]

function KitchenPage() {
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')
  const loadOrders = () => getOrders().then(({ data }) => setOrders(data.data)).catch(() => setError('We could not load the kitchen queue.'))
  useEffect(() => { loadOrders() }, [])

  async function moveOrder(orderId, status) {
    try { await updateOrderStatus(orderId, status); loadOrders() } catch { setError('We could not update this order.') }
  }

  return <Stack spacing={3}>
    <Stack spacing={0.5}><Typography variant="h4" fontWeight={900}>Kitchen queue</Typography><Typography color="text.secondary">Move orders through preparation.</Typography></Stack>
    {error && <Alert severity="error">{error}</Alert>}
    <Grid container spacing={2}>{columns.map(([status, title, nextStatus, action]) => <Grid key={status} size={{ xs: 12, md: 4 }}><Stack spacing={1.5}><Typography fontWeight={800}>{title}</Typography>{orders.filter((order) => order.status === status).map((order) => <Paper key={order.id} sx={{ p: 2 }}><Typography fontWeight={800}>{order.order_number}</Typography><Typography variant="body2" color="text.secondary">{order.customer_name || 'Walk-in customer'}</Typography><Typography variant="body2" sx={{ my: 1 }}>{order.order_items.map((item) => `${item.quantity}× ${item.product_name}`).join(', ')}</Typography><Button size="small" variant="contained" onClick={() => moveOrder(order.id, nextStatus)}>{action}</Button></Paper>)}</Stack></Grid>)}</Grid>
  </Stack>
}

export default KitchenPage
