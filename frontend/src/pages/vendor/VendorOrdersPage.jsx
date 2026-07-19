import { useEffect, useState } from 'react'
import { Alert, Box, Button, Chip, Paper, Stack, Typography, Grid, Divider, Drawer, IconButton } from '@mui/material'
import { getOrders, updateOrderStatus } from '../../services/api'

// Helper to get local time string from ISO string
const formatTime = (isoString) => {
  if (!isoString) return ''
  try {
    const date = new Date(isoString)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  } catch {
    return ''
  }
}

// Helper to get full date and time string from ISO string
const formatDateTime = (isoString) => {
  if (!isoString) return ''
  try {
    const date = new Date(isoString)
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return `${timeStr} (${dateStr})`
  } catch {
    return ''
  }
}

// Status badge styling helper
const getStatusChipStyles = (status) => {
  switch (status) {
    case 'pending':
      return { bgcolor: '#fff8e8', color: '#d97706', border: '1px solid #fcd34d' }
    case 'preparing':
      return { bgcolor: '#e0f2fe', color: '#0284c7', border: '1px solid #93c5fd' }
    case 'ready':
      return { bgcolor: '#f3e8ff', color: '#6b21a8', border: '1px solid #d8b4fe' }
    case 'completed':
      return { bgcolor: '#ecfff6', color: 'var(--ls-primary)', border: '1px solid #a7f3d0' }
    case 'cancelled':
      return { bgcolor: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5' }
    default:
      return { bgcolor: '#edf2f7', color: '#718096', border: '1px solid #cbd5e1' }
  }
}

// Stats Card subcomponent
function StatCard({ label, value, icon, bgColor, iconColor }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        display: 'flex',
        alignItems: 'center',
        gap: 2.25,
        border: '1px solid #e3ebf2',
        borderRadius: 3.5,
        boxShadow: '0 2px 5px rgba(30,55,80,.01)'
      }}
    >
      <Box
        sx={{
          width: 52,
          height: 52,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 2.75,
          bgcolor: bgColor,
          color: iconColor,
          flexShrink: 0
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography
          sx={{
            color: 'var(--ls-text-muted)',
            fontSize: 11,
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            lineHeight: 1.3
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            mt: 0.25,
            color: 'var(--ls-text)',
            fontSize: 22,
            fontWeight: 900,
            lineHeight: 1.1
          }}
        >
          {value}
        </Typography>
      </Box>
    </Paper>
  )
}

function VendorOrdersPage() {
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')
  const [isAuthError, setIsAuthError] = useState(false)
  const [updatingOrderId, setUpdatingOrderId] = useState('')
  const [selectedTab, setSelectedTab] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState(null)

  const loadOrders = () => {
    setError('')
    setIsAuthError(false)
    return getOrders()
      .then(({ data }) => {
        setOrders(data.data)
        // If an order details drawer is open, keep its details updated
        if (selectedOrder) {
          const updatedSelected = data.data.find(o => o.id === selectedOrder.id)
          if (updatedSelected) {
            setSelectedOrder(updatedSelected)
          }
        }
      })
      .catch((err) => {
        const status = err.response?.status
        const serverMsg = err.response?.data?.message
        if (status === 401 || status === 403) {
          setIsAuthError(true)
          setError(serverMsg || 'Your session has expired. Please sign in again.')
        } else if (err.message === 'Network Error' || !err.response) {
          setError('Cannot reach the server. Make sure the backend is running on port 5000.')
        } else {
          setError(serverMsg || 'We could not load orders.')
        }
        console.error('[VendorOrdersPage] loadOrders failed:', err)
      })
  }

  useEffect(() => {
    loadOrders()
  }, [])

  async function changeStatus(orderId, status) {
    setUpdatingOrderId(orderId)
    setError('')
    try {
      await updateOrderStatus(orderId, status)
      await loadOrders()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We could not update this order.')
    } finally {
      setUpdatingOrderId('')
    }
  }

  const getNextStatus = (currentStatus) => {
    if (currentStatus === 'pending') return 'preparing'
    if (currentStatus === 'preparing') return 'ready'
    if (currentStatus === 'ready') return 'completed'
    return null
  }

  // Active orders are anything not cancelled
  const activeOrders = orders.filter((o) => o.status !== 'cancelled')

  // Calculate statistics
  const totalVolume = activeOrders.length
  const pendingCount = orders.filter((o) => o.status === 'pending').length
  const prepCount = orders.filter((o) => o.status === 'preparing' || o.status === 'ready').length
  const completedCount = orders.filter((o) => o.status === 'completed').length

  // Filter orders by selected status tab
  const filteredOrders = activeOrders.filter((order) => {
    if (selectedTab === 'all') return true
    return order.status === selectedTab
  })

  const tabs = [
    { id: 'all', label: 'All Orders', count: totalVolume },
    { id: 'pending', label: 'Pending', count: pendingCount },
    { id: 'preparing', label: 'Kitchen Prep', count: orders.filter((o) => o.status === 'preparing').length },
    { id: 'ready', label: 'Ready to Pick', count: orders.filter((o) => o.status === 'ready').length },
    { id: 'completed', label: 'Completed', count: completedCount },
  ]

  return (
    <Stack spacing={4.5} sx={{ maxWidth: 1160, mx: 'auto', pb: 5 }}>
      {/* Header Row */}
      <Box>
        <Typography component="h1" sx={{ color: 'var(--ls-text)', fontSize: 32, fontWeight: 900 }}>
          Orders Management
        </Typography>
        <Typography sx={{ mt: 0.5, color: 'var(--ls-text-muted)', fontSize: 15, fontWeight: 500 }}>
          Review client requests, control active prep, and process completed transactions efficiently.
        </Typography>
      </Box>

      {error && (
        <Alert
          severity="error"
          onClose={() => { setError(''); setIsAuthError(false) }}
          action={
            isAuthError ? (
              <Button
                component="a"
                href="/vendor/login"
                size="small"
                sx={{ color: '#ef4444', fontWeight: 800, textTransform: 'none' }}
              >
                Sign In Again
              </Button>
            ) : (
              <Button
                onClick={loadOrders}
                size="small"
                sx={{ color: '#ef4444', fontWeight: 800, textTransform: 'none' }}
              >
                Retry
              </Button>
            )
          }
        >
          {error}
        </Alert>
      )}

      {/* Stats Cards Section */}
      <Grid container spacing={{ xs: 2, sm: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="TOTAL VOLUME"
            value={`${totalVolume} Orders`}
            bgColor="#edf2f7"
            iconColor="#475569"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <line x1="10" y1="9" x2="8" y2="9" />
              </svg>
            }
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="NEW & PENDING"
            value={`${pendingCount} Queue`}
            bgColor="#fff8e8"
            iconColor="#d97706"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            }
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="IN PREP & KITCHEN"
            value={`${prepCount} Prep`}
            bgColor="#e0f2fe"
            iconColor="#0284c7"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            }
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="COMPLETED TODAY"
            value={`${completedCount} Fulfilled`}
            bgColor="#ecfff6"
            iconColor="#00956c"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            }
          />
        </Grid>
      </Grid>

      {/* Tabs and Cards Section */}
      <Stack spacing={3}>
        {/* Navigation Tabs */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
          sx={{ borderBottom: '1px solid #e8eef4', pb: 0.5 }}
        >
          <Stack direction="row" spacing={3} sx={{ overflowX: 'auto', width: '100%' }}>
            {tabs.map((tab) => {
              const active = selectedTab === tab.id
              return (
                <Button
                  key={tab.id}
                  variant="text"
                  onClick={() => setSelectedTab(tab.id)}
                  sx={{
                    position: 'relative',
                    px: 1.5,
                    py: 1.5,
                    color: active ? 'var(--ls-primary)' : 'var(--ls-text-muted)',
                    fontWeight: active ? 900 : 700,
                    fontSize: 14,
                    textTransform: 'none',
                    minWidth: 'auto',
                    whiteSpace: 'nowrap',
                    borderRadius: 0,
                    '&:hover': { bgcolor: 'transparent', color: 'var(--ls-primary)' },
                    '&::after': active ? {
                      content: '""',
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      bgcolor: 'var(--ls-primary)',
                      borderRadius: '3px 3px 0 0'
                    } : {}
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography sx={{ fontWeight: 'inherit', fontSize: 'inherit' }}>{tab.label}</Typography>
                    <Box
                      sx={{
                        px: 0.9,
                        py: 0.2,
                        borderRadius: 2,
                        bgcolor: active ? '#ecfff6' : '#edf2f7',
                        color: active ? 'var(--ls-primary)' : '#718096',
                        fontSize: 11,
                        fontWeight: 900
                      }}
                    >
                      {tab.count}
                    </Box>
                  </Stack>
                </Button>
              )
            })}
          </Stack>
          <Typography sx={{ color: 'var(--ls-text-muted)', fontSize: 13, fontWeight: 700, pr: 1.5 }}>
            Showing {filteredOrders.length} of {activeOrders.length} orders
          </Typography>
        </Stack>

        {/* Orders Cards Grid */}
        {filteredOrders.length === 0 ? (
          <Paper elevation={0} sx={{ p: 6, border: '1px dashed #cbd5e1', borderRadius: 3.5, textAlign: 'center' }}>
            <Typography sx={{ color: 'var(--ls-text-muted)', fontSize: 15, fontWeight: 600 }}>
              No active orders in this queue.
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {filteredOrders.map((order) => (
              <Grid size={{ xs: 12, md: 6 }} key={order.id}>
                <Paper
                  elevation={0}
                  onClick={() => setSelectedOrder(order)}
                  sx={{
                    p: 3,
                    border: '1px solid #e3ebf2',
                    borderRadius: 3.5,
                    boxShadow: '0 2px 6px rgba(30,55,80,.01)',
                    bgcolor: 'var(--ls-surface)',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 20px rgba(30,55,80,.05)',
                      borderColor: '#b4c6d8'
                    }
                  }}
                >
                  <Stack spacing={2.5}>
                    {/* Card Header: Order Reference and Status Badge */}
                    <Stack direction="row" justifyContent="space-between" alignItems="start" spacing={1.5}>
                      <Box>
                        <Typography
                          sx={{
                            color: 'var(--ls-text-muted)',
                            fontSize: 10.5,
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            letterSpacing: 0.8
                          }}
                        >
                          ORDER REFERENCE
                        </Typography>
                        <Typography sx={{ color: 'var(--ls-text)', fontSize: 14.5, fontWeight: 900, mt: 0.3 }}>
                          {order.order_number.length > 18 ? `${order.order_number.substring(0, 18)}...` : order.order_number}
                        </Typography>
                      </Box>
                      <Chip
                        label={order.status.toUpperCase()}
                        size="small"
                        sx={{
                          fontWeight: 900,
                          fontSize: 10,
                          px: 0.8,
                          borderRadius: 2,
                          ...getStatusChipStyles(order.status)
                        }}
                      />
                    </Stack>

                    {/* Time / Customer row without category */}
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          bgcolor: 'var(--ls-surface-muted)',
                          color: '#475569',
                          py: 0.6,
                          px: 1.25,
                          borderRadius: 2.25
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 12.5, color: '#475569' }}>
                          {formatTime(order.created_at)}
                        </Typography>
                      </Box>
                      {order.customer_name && (
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            bgcolor: '#e2f8f0',
                            color: 'var(--ls-primary)',
                            py: 0.6,
                            px: 1.25,
                            borderRadius: 2.25
                          }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                          <Typography variant="body2" sx={{ fontWeight: 800, fontSize: 12.5, color: 'var(--ls-primary)' }}>
                            {order.customer_name}
                          </Typography>
                        </Box>
                      )}
                    </Stack>

                    {/* Order Items List */}
                    <Box>
                      <Typography
                        sx={{
                          color: 'var(--ls-text-muted)',
                          fontSize: 10.5,
                          fontWeight: 900,
                          textTransform: 'uppercase',
                          letterSpacing: 0.8,
                          mb: 1.25
                        }}
                      >
                        ORDER ITEMS
                      </Typography>
                      <Stack spacing={0.8}>
                        {order.order_items.map((item) => (
                          <Stack key={item.id} direction="row" justifyContent="space-between" spacing={2}>
                            <Typography variant="body2" sx={{ color: '#1e293b', fontWeight: 600 }}>
                              <Box component="span" sx={{ color: 'var(--ls-text-muted)', fontWeight: 800, mr: 0.5 }}>{item.quantity}x</Box> {item.product_name}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>
                              RM {Number(item.subtotal || (item.unit_price * item.quantity)).toFixed(2)}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </Box>

                    <Divider sx={{ borderStyle: 'dashed', borderColor: '#e2ebf0', my: 0.5 }} />

                    {/* Grand Total and Advance Button */}
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography
                          sx={{
                            color: 'var(--ls-text-muted)',
                            fontSize: 10.5,
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            letterSpacing: 0.8
                          }}
                        >
                          GRAND TOTAL
                        </Typography>
                        <Typography sx={{ color: 'var(--ls-text)', fontSize: 18.5, fontWeight: 900, mt: 0.2 }}>
                          RM {Number(order.total_amount).toFixed(2)}
                        </Typography>
                      </Box>

                      {/* Advance Button */}
                      {getNextStatus(order.status) ? (
                        <Button
                          variant="contained"
                          onClick={(e) => {
                            e.stopPropagation()
                            changeStatus(order.id, getNextStatus(order.status))
                          }}
                          disabled={updatingOrderId === order.id}
                          sx={{
                            bgcolor: 'var(--ls-primary)',
                            color: '#fff',
                            textTransform: 'none',
                            fontWeight: 900,
                            px: 2.25,
                            py: 0.9,
                            borderRadius: 2.5,
                            fontSize: 13,
                            boxShadow: '0 3px 8px rgba(0, 149, 108, 0.12)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.75,
                            '&:hover': {
                              bgcolor: 'var(--ls-primary)',
                              boxShadow: '0 4px 12px rgba(0, 149, 108, 0.22)'
                            }
                          }}
                        >
                          {updatingOrderId === order.id ? 'Updating…' : (
                            <>
                              Advance
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6" />
                              </svg>
                            </>
                          )}
                        </Button>
                      ) : (
                        <Box sx={{ color: 'var(--ls-text-muted)', display: 'flex', alignItems: 'center', gap: 0.5, pr: 1 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <Typography variant="body2" sx={{ fontWeight: 800, fontSize: 13, textTransform: 'capitalize' }}>
                            {order.status}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </Stack>

      {/* Drawer: Detailed Order Ledger View */}
      <Drawer
        anchor="right"
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        slotProps={{
          paper: {
            sx: {
              width: { xs: '100vw', sm: 460 },
              borderLeft: '1px solid #e7edf3',
              bgcolor: 'var(--ls-surface)',
              boxSizing: 'border-box'
            }
          }
        }}
      >
        {selectedOrder && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', width: '100%' }}>
            {/* Drawer Header */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                px: 3.5,
                py: 3,
                borderBottom: '1px solid #e7edf3',
                bgcolor: 'var(--ls-surface-muted)',
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              <Box>
                <Typography
                  sx={{
                    color: 'var(--ls-text)',
                    fontSize: 14,
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: 1
                  }}
                >
                  ORDER LEDGER DETAIL
                </Typography>
                <Typography sx={{ color: 'var(--ls-text-muted)', fontSize: 13, fontWeight: 700, mt: 0.3 }}>
                  {selectedOrder.order_number}
                </Typography>
              </Box>
              <IconButton onClick={() => setSelectedOrder(null)} sx={{ color: 'var(--ls-text-muted)', ml: 'auto' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </IconButton>
            </Box>

            {/* Drawer Scrollable Content */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3.5, width: '100%', boxSizing: 'border-box' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5, width: '100%' }}>
                {/* Section 1: Basic Info Grid */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
                  {selectedOrder.customer_name && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <Typography sx={{ color: 'var(--ls-text-muted)', fontSize: 11.5, fontWeight: 900, letterSpacing: 0.5 }}>
                        CUSTOMER NAME
                      </Typography>
                      <Typography sx={{ color: 'var(--ls-text)', fontSize: 14, fontWeight: 800 }}>
                        {selectedOrder.customer_name}
                      </Typography>
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <Typography sx={{ color: 'var(--ls-text-muted)', fontSize: 11.5, fontWeight: 900, letterSpacing: 0.5 }}>
                      CREATED AT
                    </Typography>
                    <Typography sx={{ color: 'var(--ls-text)', fontSize: 14, fontWeight: 800 }}>
                      {formatDateTime(selectedOrder.created_at)}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <Typography sx={{ color: 'var(--ls-text-muted)', fontSize: 11.5, fontWeight: 900, letterSpacing: 0.5 }}>
                      CURRENT STATE
                    </Typography>
                    <Chip
                      label={selectedOrder.status.toUpperCase()}
                      size="small"
                      sx={{
                        fontWeight: 900,
                        fontSize: 10.5,
                        borderRadius: 2,
                        ...getStatusChipStyles(selectedOrder.status)
                      }}
                    />
                  </Box>
                </Box>

                <Divider sx={{ borderColor: 'var(--ls-border-subtle)' }} />

                {/* Section 2: Ordered Items */}
                <Box sx={{ width: '100%' }}>
                  <Typography
                    sx={{
                      color: 'var(--ls-text-muted)',
                      fontSize: 11.5,
                      fontWeight: 900,
                      letterSpacing: 0.5,
                      mb: 1.75
                    }}
                  >
                    ORDERED ITEMS
                  </Typography>

                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      bgcolor: 'var(--ls-surface-muted)',
                      border: '1px solid #eef2f6',
                      borderRadius: 3.5,
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%' }}>
                      {selectedOrder.order_items.map((item) => (
                        <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <Typography variant="body2" sx={{ color: '#1e293b', fontWeight: 600 }}>
                            <Box component="span" sx={{ color: 'var(--ls-text-muted)', fontWeight: 800, mr: 0.5 }}>{item.quantity}x</Box> {item.product_name}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#1e293b', fontWeight: 700 }}>
                            RM {Number(item.subtotal || (item.unit_price * item.quantity)).toFixed(2)}
                          </Typography>
                        </Box>
                      ))}

                      <Divider sx={{ borderStyle: 'dotted', my: 0.5, borderColor: '#cbd5e1', width: '100%' }} />

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <Typography sx={{ color: 'var(--ls-text)', fontWeight: 800, fontSize: 14 }}>
                          Total Charged
                        </Typography>
                        <Typography sx={{ color: 'var(--ls-primary)', fontWeight: 900, fontSize: 15.5 }}>
                          RM {Number(selectedOrder.total_amount).toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Box>

                <Divider sx={{ borderColor: 'var(--ls-border-subtle)' }} />

                {/* Section 3: Workflow Progression buttons */}
                <Box sx={{ width: '100%' }}>
                  <Typography
                    sx={{
                      color: 'var(--ls-text-muted)',
                      fontSize: 11.5,
                      fontWeight: 900,
                      letterSpacing: 0.5,
                      mb: 2
                    }}
                  >
                    WORKFLOW PROGRESSION
                  </Typography>

                  <Stack direction="row" spacing={1.5} sx={{ width: '100%' }}>
                    {/* Cancel Button */}
                    {(selectedOrder.status === 'pending' || selectedOrder.status === 'preparing') && (
                      <Button
                        variant="outlined"
                        color="error"
                        fullWidth
                        onClick={async () => {
                          await changeStatus(selectedOrder.id, 'cancelled')
                          setSelectedOrder((prev) => ({ ...prev, status: 'cancelled' }))
                        }}
                        disabled={updatingOrderId === selectedOrder.id}
                        sx={{
                          borderRadius: 2.5,
                          py: 1.25,
                          fontWeight: 800,
                          textTransform: 'none',
                          fontSize: 13.5
                        }}
                      >
                        Cancel Order
                      </Button>
                    )}

                    {/* Advance Button */}
                    {getNextStatus(selectedOrder.status) ? (
                      <Button
                        variant="contained"
                        fullWidth
                        onClick={async () => {
                          const nextSt = getNextStatus(selectedOrder.status)
                          await changeStatus(selectedOrder.id, nextSt)
                          setSelectedOrder((prev) => ({ ...prev, status: nextSt }))
                        }}
                        disabled={updatingOrderId === selectedOrder.id}
                        sx={{
                          bgcolor: 'var(--ls-primary)',
                          borderRadius: 2.5,
                          py: 1.25,
                          fontWeight: 900,
                          textTransform: 'none',
                          fontSize: 13.5,
                          boxShadow: '0 3px 8px rgba(0, 149, 108, 0.12)',
                          '&:hover': {
                            bgcolor: 'var(--ls-primary)'
                          }
                        }}
                      >
                        {updatingOrderId === selectedOrder.id ? 'Updating…' : (
                          <>
                            {selectedOrder.status === 'pending' && '✓ Start Preparing'}
                            {selectedOrder.status === 'preparing' && '✓ Mark Ready'}
                            {selectedOrder.status === 'ready' && '✓ Complete Order'}
                          </>
                        )}
                      </Button>
                    ) : (
                      <Box
                        sx={{
                          p: 2,
                          bgcolor: selectedOrder.status === 'completed' ? '#ecfff6' : '#fef2f2',
                          color: selectedOrder.status === 'completed' ? 'var(--ls-primary)' : '#ef4444',
                          border: '1px dashed',
                          borderColor: selectedOrder.status === 'completed' ? '#c8f1df' : '#fca5a5',
                          borderRadius: 3.5,
                          width: '100%',
                          textAlign: 'center',
                          fontWeight: 800,
                          fontSize: 13.5
                        }}
                      >
                        {selectedOrder.status === 'completed' ? '✓ Order Completed & Closed' : '✕ Order Cancelled'}
                      </Box>
                    )}
                  </Stack>
                </Box>
              </Box>
            </Box>
          </Box>
        )}
      </Drawer>
    </Stack>
  )
}

export default VendorOrdersPage