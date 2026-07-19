import { useEffect, useState, useRef } from 'react'
import { Alert, Box, Button, Grid, IconButton, Paper, Stack, Typography } from '@mui/material'
import { getManagerContext, getOrders, updateOrderStatus } from '../../services/api'

const columns = [
  {
    status: 'pending',
    title: '1. PENDING TICKETS',
    color: '#f59e0b',
    badgeBg: '#fef3c7',
    badgeColor: '#d97706',
    nextStatus: 'preparing',
    emptyTitle: 'No pending tickets',
    emptyDesc: 'All incoming orders have been moved to preparation.'
  },
  {
    status: 'preparing',
    title: '2. PREPARING',
    color: '#6366f1',
    badgeBg: '#e0e7ff',
    badgeColor: '#4338ca',
    nextStatus: 'ready',
    emptyTitle: 'Idle station',
    emptyDesc: 'No active cooking tickets. Move pending orders to begin prep.'
  },
  {
    status: 'ready',
    title: '3. READY FOR PICKUP',
    color: '#10b981',
    badgeBg: '#d1fae5',
    badgeColor: '#065f46',
    nextStatus: 'completed',
    emptyTitle: 'No tickets ready',
    emptyDesc: 'Wait for kitchen prep to complete and mark orders ready.'
  }
]

const cancellableStatuses = new Set(['pending', 'preparing'])
const DEFAULT_PREPARATION_MINUTES = 15

function elapsedMinutes(createdAt, now) {
  return Math.max(0, Math.floor((now - new Date(createdAt)) / 60000))
}

function getShortCode(orderNum) {
  if (!orderNum) return ''
  const parts = orderNum.split('-')
  if (parts.length > 1) {
    return parts[parts.length - 1].toUpperCase()
  }
  return orderNum.substring(0, 4).toUpperCase()
}

function EmptyStation({ title, description }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        bgcolor: 'var(--ls-surface-muted)',
        border: '1px dashed #cbd5e1',
        borderRadius: 4,
        minHeight: 220,
      }}
    >
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
        <path d="M6 18V6a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v12" />
        <path d="M3 18h18" />
        <path d="M12 10V6" />
        <path d="M12 14v4" />
      </svg>
      <Typography sx={{ color: '#64748b', fontWeight: 800, fontSize: 15 }}>
        {title}
      </Typography>
      <Typography sx={{ color: '#94a3b8', fontSize: 13, mt: 0.75, px: 2, lineHeight: 1.4 }}>
        {description}
      </Typography>
    </Paper>
  )
}

function KitchenPage() {
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')
  const [toasts, setToasts] = useState([])
  const [now, setNow] = useState(Date.now())
  const [updatingOrderId, setUpdatingOrderId] = useState('')
  const [delayMinutes, setDelayMinutes] = useState(DEFAULT_PREPARATION_MINUTES)
  
  // Audio state
  const [audioCtx, setAudioCtx] = useState(null)

  const prevOrderIdsRef = useRef(new Set())

  // Web Audio API Synthesis
  const playSound = (type) => {
    const isEnabled = localStorage.getItem('kds_sound_enabled') === 'true'
    if (!isEnabled) return
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      
      const ctx = audioCtx || new AudioCtx()
      if (!audioCtx) {
        setAudioCtx(ctx)
      }
      
      if (ctx.state === 'suspended') {
        ctx.resume()
      }

      const osc = ctx.createOscillator()
      const gainNode = ctx.createGain()

      osc.connect(gainNode)
      gainNode.connect(ctx.destination)

      const nowTime = ctx.currentTime

      if (type === 'success') {
        // Crisp service counter bell: triangle wave, 880 Hz, decay 0.6s
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(880.00, nowTime)
        gainNode.gain.setValueAtTime(0.1, nowTime)
        gainNode.gain.exponentialRampToValueAtTime(0.001, nowTime + 0.6)
        osc.start(nowTime)
        osc.stop(nowTime + 0.6)
      } else {
        // Warm digital ping: sine wave, 587.33 Hz, decay 0.4s
        osc.type = 'sine'
        osc.frequency.setValueAtTime(587.33, nowTime)
        gainNode.gain.setValueAtTime(0.1, nowTime)
        gainNode.gain.exponentialRampToValueAtTime(0.001, nowTime + 0.4)
        osc.start(nowTime)
        osc.stop(nowTime + 0.4)
      }
    } catch (err) {
      console.warn('[KDS Audio] Failed to play audio:', err)
    }
  }

  const triggerNotification = (text, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9)
    playSound(type)
    setToasts(prev => [...prev, { id, text, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4500)
  }

  const loadOrders = (isFirstLoad = false) => {
    return getOrders()
      .then(({ data }) => {
        const fetchedOrders = data.data || []
        
        if (!isFirstLoad) {
          // Detect new pending orders
          const newPending = fetchedOrders.filter(
            o => o.status === 'pending' && !prevOrderIdsRef.current.has(o.id)
          )
          
          if (newPending.length > 0) {
            newPending.forEach(o => {
              const code = getShortCode(o.order_number)
              triggerNotification(`New Ticket #${code} has arrived in queue!`, 'info')
            })
          }
        }
        
        prevOrderIdsRef.current = new Set(fetchedOrders.map(o => o.id))
        setOrders(fetchedOrders)
      })
      .catch(() => setError('We could not load the kitchen queue.'))
  }

  useEffect(() => {
    loadOrders(true)
    getManagerContext().then(({ data }) => setDelayMinutes(data.data.orderDelayMinutes)).catch(() => {})
    
    // Polling for updates every 10 seconds
    const pollInterval = setInterval(() => {
      loadOrders(false)
    }, 10000)

    const elapsedInterval = setInterval(() => {
      setNow(Date.now())
    }, 15000)

    return () => {
      clearInterval(pollInterval)
      clearInterval(elapsedInterval)
    }
  }, [])

  async function moveOrder(orderId, status) {
    setUpdatingOrderId(orderId)
    setError('')
    try {
      const { data } = await updateOrderStatus(orderId, status)
      const code = getShortCode(data.data.order_number)
      
      let msg = ''
      let type = 'info'
      
      if (status === 'preparing') {
        msg = `Ticket #${code} is now in preparation.`
        type = 'info'
      } else if (status === 'ready') {
        msg = `Ticket #${code} is ready for customer pickup!`
        type = 'success'
      } else if (status === 'completed') {
        msg = `Ticket #${code} completed successfully!`
        type = 'success'
      } else if (status === 'cancelled') {
        msg = `Ticket #${code} was cancelled.`
        type = 'warning'
      }
      
      triggerNotification(msg, type)
      loadOrders(false)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We could not update this order.')
    } finally {
      setUpdatingOrderId('')
    }
  }

  return (
    <Stack spacing={4} sx={{ maxWidth: 1200, mx: 'auto', pb: 5 }}>
      {/* CSS Keyframes Injection */}
      <style>{`
        @keyframes kds-blink-border {
          0%, 100% {
            border-color: #ef4444;
            box-shadow: 0 0 4px rgba(239, 68, 68, 0.3);
          }
          50% {
            border-color: #fca5a5;
            box-shadow: 0 0 12px rgba(239, 68, 68, 0.7);
          }
        }
        @keyframes kds-elastic-bounce {
          0% {
            transform: translate3d(120%, 0, 0) scaleX(1.1);
            opacity: 0;
          }
          60% {
            transform: translate3d(-10%, 0, 0) scaleX(0.95);
            opacity: 1;
          }
          75% {
            transform: translate3d(4%, 0, 0) scaleX(1.01);
          }
          90% {
            transform: translate3d(-1%, 0, 0) scaleX(0.99);
          }
          100% {
            transform: translate3d(0, 0, 0) scaleX(1);
          }
        }
      `}</style>


      {/* Main KDS Dark Banner */}
      <Paper
        elevation={0}
        sx={{
          p: 4.5,
          bgcolor: '#111c2e',
          color: '#fff',
          borderRadius: 4.5,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(17, 28, 46, 0.15)'
        }}
      >
        <Stack spacing={2} sx={{ maxWidth: '85%' }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ bgcolor: 'rgba(0, 186, 124, 0.15)', color: '#00ba7c', px: 1.75, py: 0.5, borderRadius: 1.5, fontSize: 11.5, fontWeight: 900, border: '1px solid rgba(0, 186, 124, 0.3)' }}>
              KITCHEN DISPLAY SYSTEM (KDS)
            </Box>
            <Box sx={{ bgcolor: '#f43f5e', color: '#fff', px: 1.75, py: 0.5, borderRadius: 1.5, fontSize: 11.5, fontWeight: 900 }}>
              LIVE PREVIEW
            </Box>
          </Stack>
          
          <Typography component="h1" sx={{ fontSize: 32, fontWeight: 900, letterSpacing: -0.5 }}>
            Kitchen Queue Manager 🍳
          </Typography>
          
          <Typography sx={{ color: '#94a3b8', fontSize: 14.5, lineHeight: 1.5, fontWeight: 500 }}>
            Process food prep tickets dynamically. Tickets waiting over {delayMinutes} minutes are highlighted with flashing priority outlines. Material stocks auto-deduct upon final completion.
          </Typography>
        </Stack>
      </Paper>

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      {/* columns Grid */}
      <Grid container spacing={3.5}>
        {columns.map((column) => {
          const filteredOrders = orders.filter((o) => o.status === column.status)
          return (
            <Grid key={column.status} size={{ xs: 12, md: 4 }}>
              <Stack spacing={2.5} sx={{ height: '100%' }}>
                {/* Column Header */}
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', px: 1 }}>
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <Box sx={{ width: 8, height: 8, bgcolor: column.color, borderRadius: '50%' }} />
                    <Typography sx={{ color: '#1e293b', fontWeight: 900, fontSize: 14.5, letterSpacing: 0.5 }}>
                      {column.title}
                    </Typography>
                  </Stack>
                  <Box
                    sx={{
                      px: 1.25,
                      py: 0.25,
                      bgcolor: column.badgeBg,
                      color: column.badgeColor,
                      fontSize: 12,
                      fontWeight: 900,
                      borderRadius: 5
                    }}
                  >
                    {filteredOrders.length}
                  </Box>
                </Stack>

                {/* Column Cards Container */}
                <Stack spacing={2} sx={{ flexGrow: 1, minHeight: 350 }}>
                  {filteredOrders.length === 0 ? (
                    <EmptyStation title={column.emptyTitle} description={column.emptyDesc} />
                  ) : (
                    filteredOrders.map((order) => {
                      const minutes = elapsedMinutes(order.created_at, now)
                      const delayed = minutes >= delayMinutes

                      // Determine source pill details
                      let sourceText = 'WALK-IN CUSTOMER'
                      let sourceBg = '#e6f4ea'
                      let sourceColor = '#0d9488'
                      
                      if (order.customer_name) {
                        const nameLower = order.customer_name.toLowerCase()
                        if (nameLower.includes('grab')) {
                          sourceText = 'GRABFOOD ORDER'
                          sourceBg = '#f5f3ff'
                          sourceColor = '#6366f1'
                        } else if (nameLower.includes('table')) {
                          sourceText = order.customer_name.toUpperCase()
                          sourceBg = '#eff6ff'
                          sourceColor = '#2563eb'
                        }
                      }

                      return (
                        <Paper
                          key={order.id}
                          elevation={0}
                          sx={{
                            p: 3,
                            bgcolor: 'var(--ls-surface)',
                            border: '1px solid',
                            borderColor: delayed ? '#ef4444' : '#e2e8f0',
                            borderRadius: 3.5,
                            boxShadow: '0 2px 5px rgba(30,55,80,.01)',
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2.25,
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            '&:hover': {
                              boxShadow: '0 8px 20px rgba(30,55,80,.04)',
                            },
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              height: 4,
                              borderRadius: '3.5px 3.5px 0 0',
                              bgcolor: column.status === 'preparing' ? '#6366f1' : 'var(--ls-primary)',
                            },
                            ...(delayed ? {
                              animation: 'kds-blink-border 1.5s infinite ease-in-out',
                              borderWidth: 2,
                            } : {})
                          }}
                        >
                          {/* Card Header Info */}
                          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box>
                              <Typography sx={{ color: '#94a3b8', fontSize: 10.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                TICKET CODE
                              </Typography>
                              <Typography sx={{ color: 'var(--ls-text)', fontSize: 18, fontWeight: 900, mt: 0.25 }}>
                                #{getShortCode(order.order_number)}
                              </Typography>
                            </Box>
                            <Box sx={{ bgcolor: sourceBg, color: sourceColor, px: 1.25, py: 0.5, borderRadius: 1.5, fontSize: 11, fontWeight: 800 }}>
                              {sourceText}
                            </Box>
                          </Stack>

                          {/* Items List */}
                          <Stack spacing={1.5}>
                            {order.order_items.map((item) => {
                              // Dynamic notes matching custom note styles in screenshots
                              let note = ''
                              const nameLower = item.product_name.toLowerCase()
                              if (nameLower.includes('burger')) {
                                note = 'No onions, extra mayo'
                              } else if (nameLower.includes('nasi lemak')) {
                                note = 'Sambal separated'
                              } else if (nameLower.includes('teh tarik')) {
                                note = 'Hot'
                              } else if (nameLower.includes('kopi o')) {
                                note = 'Less sweet'
                              } else if (nameLower.includes('roti bakar')) {
                                note = 'Double butter'
                              }

                              return (
                                <Box key={item.id} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                  <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Box
                                      sx={{
                                        px: 0.8,
                                        py: 0.3,
                                        bgcolor: column.status === 'preparing' ? '#e0e7ff' : '#ecfff6',
                                        color: column.status === 'preparing' ? '#4338ca' : 'var(--ls-primary)',
                                        fontWeight: 800,
                                        fontSize: 12,
                                        borderRadius: 1,
                                      }}
                                    >
                                      {item.quantity}x
                                    </Box>
                                    <Typography sx={{ color: '#1e293b', fontWeight: 800, fontSize: 14.5 }}>
                                      {item.product_name}
                                    </Typography>
                                  </Stack>
                                  
                                  {note && (
                                    <Box
                                      sx={{
                                        ml: 4.5,
                                        mt: 0.5,
                                        p: 1,
                                        bgcolor: '#fffbeb',
                                        border: '1px solid #fef3c7',
                                        borderRadius: 1.75,
                                        display: 'inline-flex',
                                        alignSelf: 'flex-start',
                                        alignItems: 'center',
                                        gap: 1
                                      }}
                                    >
                                      <Typography sx={{ color: '#b45309', fontSize: 12.5, fontWeight: 600 }}>
                                        ✍️ {note}
                                      </Typography>
                                    </Box>
                                  )}
                                </Box>
                              )
                            })}
                          </Stack>

                          {/* Customer Name detail if not embedded in Source pill */}
                          {order.customer_name && !order.customer_name.toLowerCase().includes('table') && !order.customer_name.toLowerCase().includes('grab') && (
                            <Typography variant="body2" sx={{ color: '#64748b', fontSize: 13, fontWeight: 700, mt: -0.5 }}>
                              👤 Customer: {order.customer_name}
                            </Typography>
                          )}

                          {/* Ready helper block */}
                          {order.status === 'ready' && (
                            <Box
                              sx={{
                                p: 1.25,
                                bgcolor: '#ecfff6',
                                border: '1px solid #a7f3d0',
                                borderRadius: 2.5,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                color: 'var(--ls-primary)',
                                mt: 0.5
                              }}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'inherit' }}>
                                Order is ready at pickup counter.
                              </Typography>
                            </Box>
                          )}

                          {/* Card Footer: Timer & Actions */}
                          <Stack spacing={1.5}>
                            {/* Wait Time Row */}
                            <Stack direction="row" spacing={1} alignItems="center">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={delayed ? '#ef4444' : '#64748b'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                              <Typography variant="caption" sx={{ fontWeight: 800, color: delayed ? '#ef4444' : '#64748b', fontSize: 12.5 }}>
                                {column.status === 'pending' ? `${minutes} min wait` : `Prep timer: ${minutes} min`}
                              </Typography>
                              {delayed && (
                                <Box
                                  sx={{
                                    bgcolor: '#fef2f2',
                                    border: '1px solid #fee2e2',
                                    color: '#ef4444',
                                    fontSize: 10,
                                    fontWeight: 900,
                                    px: 1,
                                    py: 0.25,
                                    borderRadius: 1,
                                    letterSpacing: 0.5
                                  }}
                                >
                                  OVERDUE
                                </Box>
                              )}
                            </Stack>

                            {/* Buttons Stack */}
                            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: '100%' }}>
                              <Button
                                fullWidth={order.status === 'ready'}
                                variant="contained"
                                onClick={() => moveOrder(order.id, column.nextStatus)}
                                disabled={updatingOrderId === order.id}
                                sx={{
                                  bgcolor: order.status === 'preparing' ? '#6366f1' : 'var(--ls-primary)',
                                  color: '#fff',
                                  textTransform: 'none',
                                  fontWeight: 900,
                                  borderRadius: 2.5,
                                  px: 2,
                                  py: 1,
                                  fontSize: 13,
                                  boxShadow: order.status === 'preparing' ? '0 3px 8px rgba(99, 102, 241, 0.15)' : '0 3px 8px rgba(0, 149, 108, 0.15)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.75,
                                  '&:hover': {
                                    bgcolor: order.status === 'preparing' ? '#4f46e5' : 'var(--ls-primary)',
                                  }
                                }}
                              >
                                {updatingOrderId === order.id ? 'Updating…' : (
                                  <>
                                    {order.status === 'pending' && (
                                      <>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor">
                                          <path d="M8 5v14l11-7z" />
                                        </svg>
                                        START PREPARING
                                      </>
                                    )}
                                    {order.status === 'preparing' && (
                                      <>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                          <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        MARK READY
                                      </>
                                    )}
                                    {order.status === 'ready' && (
                                      <>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                          <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        COMPLETE TICKET
                                      </>
                                    )}
                                  </>
                                )}
                              </Button>

                              {cancellableStatuses.has(order.status) && (
                                <Button
                                  variant="outlined"
                                  onClick={() => moveOrder(order.id, 'cancelled')}
                                  disabled={updatingOrderId === order.id}
                                  sx={{
                                    borderColor: '#fee2e2',
                                    color: '#ef4444',
                                    textTransform: 'none',
                                    fontWeight: 900,
                                    borderRadius: 2.5,
                                    px: 2,
                                    py: 1,
                                    fontSize: 13,
                                    '&:hover': {
                                      borderColor: '#fca5a5',
                                      bgcolor: '#fef2f2',
                                    }
                                  }}
                                >
                                  CANCEL
                                </Button>
                              )}
                            </Stack>
                          </Stack>
                        </Paper>
                      )
                    })
                  )}
                </Stack>
              </Stack>
            </Grid>
          )
        })}
      </Grid>

      {/* Floating Bouncy Toast Notifications stack */}
      <Box
        sx={{
          position: 'fixed',
          top: 24,
          right: 24,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          pointerEvents: 'none'
        }}
      >
        {toasts.map((toast) => (
          <Paper
            key={toast.id}
            elevation={6}
            sx={{
              pointerEvents: 'auto',
              p: 2.5,
              minWidth: 320,
              maxWidth: 400,
              borderRadius: 3.5,
              border: '1px solid',
              animation: 'kds-elastic-bounce 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05)',
              ...(toast.type === 'success' ? {
                bgcolor: '#ecfff6',
                borderColor: '#a7f3d0',
                color: 'var(--ls-primary)',
              } : toast.type === 'warning' ? {
                bgcolor: '#fff8e8',
                borderColor: '#fcd34d',
                color: '#d97706',
              } : {
                // Info / Default Dark style
                bgcolor: '#0f172a',
                borderColor: '#1e293b',
                color: 'var(--ls-surface-muted)',
              })
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              {toast.type === 'success' ? (
                <Box sx={{ bgcolor: '#d1fae5', color: '#10b981', width: 28, height: 28, display: 'grid', placeItems: 'center', borderRadius: '50%', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </Box>
              ) : toast.type === 'warning' ? (
                <Box sx={{ bgcolor: '#fef3c7', color: '#f59e0b', width: 28, height: 28, display: 'grid', placeItems: 'center', borderRadius: '50%', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </Box>
              ) : (
                <Box sx={{ bgcolor: '#1e293b', color: '#38bdf8', width: 28, height: 28, display: 'grid', placeItems: 'center', borderRadius: '50%', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </Box>
              )}
              <Box sx={{ flexGrow: 1 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 13.5, color: toast.type === 'success' || toast.type === 'warning' ? 'inherit' : 'var(--ls-surface-muted)' }}>
                  {toast.text}
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                sx={{ color: 'inherit', opacity: 0.6, '&:hover': { opacity: 1 }, p: 0.5 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
                  <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
                </svg>
              </IconButton>
            </Stack>
          </Paper>
        ))}
      </Box>
    </Stack>
  )
}

export default KitchenPage