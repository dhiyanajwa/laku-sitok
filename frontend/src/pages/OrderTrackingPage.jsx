import { useEffect, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, CircularProgress, Container, Stack, Step, StepLabel, Stepper, Typography } from '@mui/material'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { getOrderTracking } from '../services/api'

const steps = ['Order received', 'Preparing your food', 'Ready for pickup', 'Completed']
const messages = {
  pending: 'Your order has been received. The kitchen will start soon.',
  preparing: 'Your food is being prepared fresh now.',
  ready: 'Your order is ready for pickup. Please show your order number at the counter.',
  completed: 'This order has been completed. Thank you for visiting us!',
  cancelled: 'This order was cancelled. Please speak with the vendor if you need help.',
}
const stepIndex = { pending: 0, preparing: 1, ready: 2, completed: 3 }

function OrderTrackingPage() {
  const { trackingToken } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastChecked, setLastChecked] = useState(null)

  async function loadTracking(showLoading = false) {
    if (showLoading) setLoading(true)
    try { const response = await getOrderTracking(trackingToken); setOrder(response.data.data); setError(''); setLastChecked(new Date()) } catch (requestError) { setError(requestError.response?.data?.message || 'We could not load this order.') } finally { setLoading(false) }
  }

  useEffect(() => {
    loadTracking(true)
    const timer = setInterval(() => loadTracking(false), 8000)
    return () => clearInterval(timer)
  }, [trackingToken])

  if (loading) return <Container maxWidth="sm" sx={{ py: 10 }}><Stack alignItems="center" spacing={2}><CircularProgress /><Typography>Loading your order…</Typography></Stack></Container>
  if (error) return <Container maxWidth="sm" sx={{ py: 6 }}><Stack spacing={2}><Alert severity="error">{error}</Alert><Button component={RouterLink} to="/menu" variant="contained">Return to menu</Button></Stack></Container>

  const isCancelled = order.status === 'cancelled'
  const isReady = order.status === 'ready'
  return <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 4, md: 8 } }}><Container maxWidth="sm"><Stack spacing={3}>
    <Box><Typography color="primary" fontWeight={900}>Laku Sitok</Typography><Typography variant="h4" fontWeight={900}>Track your order</Typography><Typography color="text.secondary">Order {order.orderNumber}</Typography></Box>
    <Card><CardContent><Stack spacing={2.5}>
      <Alert severity={isCancelled ? 'error' : isReady ? 'success' : 'info'}><Typography fontWeight={800}>{isReady ? 'Ready for pickup' : isCancelled ? 'Order cancelled' : 'Order update'}</Typography>{messages[order.status]}</Alert>
      {!isCancelled && <Stepper activeStep={stepIndex[order.status]} alternativeLabel>{steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}</Stepper>}
      <Typography variant="body2" color="text.secondary">Usually ready in 10–15 minutes. {lastChecked && `Updated ${lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`}</Typography>
    </Stack></CardContent></Card>
    <Card><CardContent><Stack spacing={1}><Typography fontWeight={800}>Order summary</Typography>{order.items.map((item) => <Typography key={item.productName}>{item.quantity}× {item.productName}</Typography>)}</Stack></CardContent></Card>
    <Button component={RouterLink} to="/menu" variant="outlined">Return to menu</Button>
  </Stack></Container></Box>
}

export default OrderTrackingPage
