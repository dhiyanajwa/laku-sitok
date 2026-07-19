import { useCallback, useEffect, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Container, Divider, IconButton, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { getOrderTracking } from '../services/api'

const steps = [
  { key: 'pending', label: 'Order Received', pendingLabel: 'Current', icon: 'receipt' },
  { key: 'preparing', label: 'Preparing', pendingLabel: 'In progress', icon: 'chef' },
  { key: 'ready', label: 'Ready for Pickup', pendingLabel: 'Pending', icon: 'bag' },
  { key: 'completed', label: 'Completed', pendingLabel: 'Picked up', icon: 'check' },
]

const statusMeta = {
  pending: { title: 'Order Received', description: 'Your order has been received by Warung Murni. The kitchen crew will start preparing your fresh meal soon.', update: 'Usually ready in 10-15 mins', estimate: '15 Mins', color: '#377ce9', bg: '#eff6ff', border: '#b9d6ff' },
  preparing: { title: 'Preparing Food', description: 'The kitchen is preparing your order fresh with care. Your meal will be ready shortly.', update: 'Ready in approximately 5-8 mins', estimate: '5-8 Mins', color: '#d97706', bg: '#fff9e8', border: '#f5d470' },
  ready: { title: 'Ready for Pickup', description: 'Hooray! Your meal is freshly packed and resting warm at the Warung Murni pickup counter.', update: 'Ready now for immediate counter pickup', estimate: 'Ready now', color: '#008764', bg: '#eafff5', border: '#9ceac9' },
  completed: { title: 'Order Completed', description: 'Thank you for dining with Laku Sitok! We hope you enjoyed your Sarawakian comfort meal from Warung Murni.', update: 'Picked up', estimate: 'Done', color: '#007b5b', bg: '#f1f5f9', border: '#d9e2ec' },
  cancelled: { title: 'Order Cancelled', description: 'This order was cancelled. Please contact Warung Murni if you need help.', update: 'Updated just now', estimate: 'Cancelled', color: '#b42318', bg: '#fff1f0', border: '#ffc9c4' },
}

const formatCurrency = (amount) => new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(Number(amount || 0))
const formatTime = (value) => value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'

function TrackingIcon({ name, size = 22, strokeWidth = 1.9 }) {
  const paths = {
    back: <path d="M19 12H5m6-6-6 6 6 6" />,
    copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></>,
    receipt: <><path d="M7 3h10v18l-2.5-1.6L12 21l-2.5-1.6L7 21V3Z" /><path d="M10 8h4m-4 4h4" /></>,
    chef: <><path d="M6 12h12v7H6z" /><path d="M8 12V9a4 4 0 0 1 8 0v3M4 12h16" /><path d="M9 19h6" /></>,
    bag: <><path d="M6 8h12l1 12H5L6 8Z" /><path d="M9 8a3 3 0 0 1 6 0" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    phone: <path d="M5 4h3l1.5 4-2 1.5a15 15 0 0 0 7 7l1.5-2L20 16v3c0 1-1 2-2 2C10 21 3 14 3 6c0-1 1-2 2-2Z" />,
    chat: <path d="M20 15a3 3 0 0 1-3 3H9l-5 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v9Z" />,
    truck: <><path d="M3 6h11v10H3zM14 10h3l3 3v3h-6z" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></>,
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function OrderTrackingPage() {
  const { trackingToken } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastChecked, setLastChecked] = useState(null)
  const [copied, setCopied] = useState(false)

  const loadTracking = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try { const response = await getOrderTracking(trackingToken); setOrder(response.data.data); setError(''); setLastChecked(new Date()) } catch (requestError) { setError(requestError.response?.data?.message || 'We could not load this order.') } finally { setLoading(false) }
  }, [trackingToken])

  useEffect(() => {
    loadTracking(true)
    const timer = setInterval(() => loadTracking(false), 8000)
    return () => clearInterval(timer)
  }, [loadTracking])

  async function copyOrderNumber() {
    try { await navigator.clipboard.writeText(order.orderNumber); setCopied(true) } catch { setError('We could not copy the order number.') }
  }

  if (loading) return <Container maxWidth="sm" sx={{ py: 10 }}><Stack alignItems="center" spacing={2}><CircularProgress /><Typography>Loading your order...</Typography></Stack></Container>
  if (error) return <Container maxWidth="sm" sx={{ py: 6 }}><Stack spacing={2}><Alert severity="error">{error}</Alert><Button component={RouterLink} to="/menu" variant="contained">Return to menu</Button></Stack></Container>

  const meta = statusMeta[order.status] || statusMeta.pending
  const activeIndex = steps.findIndex((step) => step.key === order.status)
  const isCancelled = order.status === 'cancelled'
  const total = order.totalAmount ?? order.items.reduce((sum, item) => sum + Number(item.subtotal || item.unitPrice * item.quantity || 0), 0)
  const updatedAt = order.updatedAt || order.createdAt
  const routeLineColor = activeIndex >= 0 ? '#00956c' : '#dbe5ef'

  return <Box sx={{ minHeight: '100vh', bgcolor: '#f7fafc', color: '#10244a', py: { xs: 2, sm: 3.5, md: 4.5 }, '@keyframes orderFloat': { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-7px)' } }, '@keyframes orderPulse': { '0%': { transform: 'scale(.88)', opacity: .8 }, '70%': { transform: 'scale(1.35)', opacity: 0 }, '100%': { transform: 'scale(1.35)', opacity: 0 } } }}>
    <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: { xs: 2.5, sm: 3.5 } }}>
        <Button component={RouterLink} to="/menu" startIcon={<TrackingIcon name="back" size={20} />} sx={{ color: '#314d6d', px: 0, textTransform: 'none', fontSize: { xs: 15, sm: 16 }, fontWeight: 800 }}>Back to Menu</Button>
        <Stack direction="row" alignItems="center" spacing={.75}><Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' }, color: '#8aa0b9' }}>Live status updates active</Typography><Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#94e5ce' }} /></Stack>
      </Stack>

      <Stack spacing={{ xs: 2.25, sm: 3 }}>
        <Paper elevation={0} sx={{ p: { xs: 2.25, sm: 3.75 }, border: '1px solid #e5edf3', borderRadius: 2.5, boxShadow: '0 2px 5px rgba(30,55,80,.035)' }}>
          <Stack spacing={{ xs: 2.5, sm: 3 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'start' }} spacing={2}>
              <Box><Typography variant="overline" sx={{ color: '#8aa0b9', letterSpacing: 1.2, fontWeight: 900 }}>ORDER TRACKING</Typography><Typography component="h1" sx={{ mt: .2, color: '#081a3e', fontSize: { xs: 32, sm: 40 }, lineHeight: 1.05, fontWeight: 900 }}>Track your order</Typography><Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.2 }}><Box sx={{ px: 1.35, py: .5, border: '1px solid #dbe5ef', borderRadius: 1.2, bgcolor: '#f3f7fb', color: '#3e5b7a', fontFamily: 'monospace', fontWeight: 800, fontSize: { xs: 12, sm: 14 } }}>{order.orderNumber}</Box><IconButton aria-label="Copy order number" onClick={copyOrderNumber} size="small" sx={{ color: copied ? '#008764' : '#8aa0b9' }}><TrackingIcon name="copy" size={20} /></IconButton></Stack></Box>
              <Box sx={{ minWidth: { sm: 175 }, alignSelf: { xs: 'stretch', sm: 'auto' }, textAlign: 'center', border: '1px solid #c5f2dd', borderRadius: 2, bgcolor: '#edfff7', px: 2.25, py: 2.1 }}><Typography variant="caption" sx={{ color: '#007b5b', fontWeight: 900, letterSpacing: .8 }}>EST. READY</Typography><Typography sx={{ mt: .35, color: '#072c24', fontSize: { xs: 25, sm: 29 }, lineHeight: 1, fontWeight: 900 }}>{meta.estimate}</Typography><Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#008764' }}>{formatTime(updatedAt)} {order.status === 'completed' ? '' : 'today'}</Typography></Box>
            </Stack>
            <Divider sx={{ borderColor: '#e5edf3' }} />

            <Box sx={{ display: 'flex', gap: 1.7, p: { xs: 1.6, sm: 2.4 }, border: '1px solid', borderColor: meta.border, borderRadius: 1.75, bgcolor: meta.bg, color: meta.color }}><Box sx={{ pt: .15, display: 'grid', placeItems: 'start' }}><TrackingIcon name={order.status === 'completed' ? 'check' : 'info'} size={25} /></Box><Box><Typography sx={{ color: '#10244a', fontWeight: 900 }}>{meta.title}</Typography><Typography variant="body2" sx={{ mt: .6, color: '#49617c', lineHeight: 1.6 }}>{meta.description}</Typography><Typography variant="caption" sx={{ display: 'block', mt: 1.2, color: meta.color, fontWeight: 900, letterSpacing: .45, textTransform: 'uppercase' }}>{meta.update} - updated {lastChecked ? 'just now' : 'recently'}</Typography></Box></Box>

            {!isCancelled && <Box sx={{ position: 'relative', display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, minmax(0, 1fr))' }, rowGap: { xs: 1.8, sm: 0 }, pt: { sm: 2.5 } }}>
              <Box sx={{ position: 'absolute', display: { xs: 'none', sm: 'block' }, top: 57, left: '12.5%', right: '12.5%', height: 5, borderRadius: 5, bgcolor: '#e7edf3', overflow: 'hidden' }}><Box sx={{ width: `${Math.max(0, activeIndex) / (steps.length - 1) * 100}%`, height: '100%', bgcolor: routeLineColor, transition: 'width .45s ease' }} /></Box>
              {steps.map((step, index) => {
                const isActive = index === activeIndex
                const isPassed = index < activeIndex || order.status === 'completed'
                const stateColor = isActive || isPassed ? '#00956c' : '#dce5ef'
                const sublabel = isActive ? 'Current' : isPassed ? 'Passed' : step.pendingLabel
                return <Box key={step.key} sx={{ position: 'relative', zIndex: 1, display: { xs: 'flex', sm: 'grid' }, gridTemplateColumns: { xs: '70px 1fr', sm: '1fr' }, gap: { xs: 1.3, sm: .8 }, alignItems: 'center', textAlign: { xs: 'left', sm: 'center' } }}>
                  <Box sx={{ gridRow: { sm: 1 }, justifySelf: { sm: 'center' }, position: 'relative', width: 64, height: 64, display: 'grid', placeItems: 'center', color: stateColor, borderRadius: '50%', bgcolor: isPassed && !isActive ? '#00956c' : '#fff', border: isActive ? '4px solid #00956c' : `4px solid ${stateColor}`, boxShadow: isActive ? '0 0 0 10px rgba(31, 193, 145, .13)' : isPassed ? '0 8px 17px rgba(0, 117, 84, .18)' : 'none', animation: isActive ? 'orderFloat 2s ease-in-out infinite' : 'none', '&::after': isActive ? { content: '""', position: 'absolute', inset: -9, border: '2px solid #7fe0bd', borderRadius: '50%', animation: 'orderPulse 2s ease-out infinite' } : {} }}><TrackingIcon name={step.icon} size={27} strokeWidth={2} /></Box>
                  <Box sx={{ gridRow: { sm: 2 } }}><Typography variant="body2" sx={{ color: isActive ? '#10244a' : isPassed ? '#006e52' : '#8aa0b9', fontWeight: 900 }}>{step.label}</Typography><Typography variant="caption" sx={{ color: '#8aa0b9' }}>{sublabel}</Typography></Box>
                </Box>
              })}
            </Box>}
          </Stack>
        </Paper>

        <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, border: '1px solid #e5edf3', borderRadius: 2.5 }}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}><Stack direction="row" spacing={1.6} alignItems="center"><Box sx={{ width: 58, height: 58, display: 'grid', placeItems: 'center', borderRadius: '50%', bgcolor: '#f0f5fa', color: '#007b5b' }}><TrackingIcon name="chef" size={29} /></Box><Box><Typography sx={{ color: '#10244a', fontWeight: 900 }}>Need help with your food prep?</Typography><Typography variant="body2" sx={{ color: '#8aa0b9' }}>Contact Warung Murni merchant counter directly</Typography></Box></Stack><Stack direction="row" spacing={1.2}><Button variant="outlined" startIcon={<TrackingIcon name="phone" size={18} />} sx={{ flex: 1, minWidth: 125, borderColor: '#e2eaf2', bgcolor: '#f4f7fb', color: '#314d6d', textTransform: 'none', fontWeight: 900 }}>Call shop</Button><Button variant="contained" startIcon={<TrackingIcon name="chat" size={18} />} sx={{ flex: 1, minWidth: 125, textTransform: 'none', fontWeight: 900 }}>WhatsApp</Button></Stack></Stack></Paper>

        <Paper elevation={0} sx={{ overflow: 'hidden', border: '1px solid #e5edf3', borderRadius: 2.5 }}><Box sx={{ px: { xs: 2, sm: 3 }, py: 2.1, bgcolor: '#fbfcfe', borderBottom: '1px solid #e8eef4' }}><Typography sx={{ color: '#10244a', fontWeight: 900, letterSpacing: .3 }}>ITEM RECEIPT</Typography></Box><Stack spacing={1.4} sx={{ p: { xs: 2, sm: 3 } }}>{order.items.map((item) => <Stack key={item.productName} direction="row" alignItems="center" spacing={1.6}><Box sx={{ width: 50, height: 50, display: 'grid', placeItems: 'center', border: '1px solid #dde7ef', borderRadius: 1.2, bgcolor: '#fff8ee', color: '#bf7424', fontWeight: 900 }}>{item.productName.charAt(0)}</Box><Box sx={{ flex: 1, minWidth: 0 }}><Typography noWrap sx={{ color: '#10244a', fontWeight: 900 }}>{item.productName}</Typography><Typography variant="body2" sx={{ color: '#8aa0b9' }}>{formatCurrency(item.unitPrice)} each</Typography></Box><Box textAlign="right"><Typography variant="body2" sx={{ color: '#8aa0b9' }}>{item.quantity}x</Typography><Typography sx={{ color: '#10244a', fontWeight: 900 }}>{formatCurrency(item.subtotal || item.unitPrice * item.quantity)}</Typography></Box></Stack>)}<Divider sx={{ my: .8, borderStyle: 'dashed', borderColor: '#dce5ef' }} /><Stack spacing={.9}><Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', columnGap: 3 }}><Typography variant="body2" color="text.secondary">Subtotal</Typography><Typography variant="body2">{formatCurrency(total)}</Typography></Box><Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', columnGap: 3 }}><Typography variant="body2" color="text.secondary">Platform service fee</Typography><Typography variant="body2" sx={{ color: '#008764', fontWeight: 800 }}>FREE</Typography></Box></Stack><Divider sx={{ my: .8, borderColor: '#e2eaf2' }} /><Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', columnGap: 3 }}><Box><Typography sx={{ color: '#10244a', fontWeight: 900 }}>Total charged</Typography><Typography variant="caption" sx={{ color: '#8aa0b9' }}>PAYMENT RECORDED WITH ORDER</Typography></Box><Typography sx={{ color: '#007b5b', fontSize: 26, fontWeight: 900 }}>{formatCurrency(total)}</Typography></Box></Stack></Paper>

        <Button component={RouterLink} to="/menu" variant="outlined" size="large" sx={{ minHeight: 58, borderColor: '#dbe5ef', bgcolor: '#f4f7fb', color: '#244168', textTransform: 'none', fontWeight: 900 }}>Return to Vendor Menu</Button>
      </Stack>
    </Container>
  </Box>
}

export default OrderTrackingPage
