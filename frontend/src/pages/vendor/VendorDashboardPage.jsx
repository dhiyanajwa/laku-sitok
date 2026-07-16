import { useCallback, useEffect, useState } from 'react'
import { Alert, Box, Card, CardContent, Grid, Stack, Typography } from '@mui/material'
import AgentActivityPanel from '../../components/AgentActivityPanel'
import { getAgentActivity, getAnalyticsOverview } from '../../services/api'

const formatCurrency = (amount) => new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(amount)

function VendorDashboardPage() {
  const [analytics, setAnalytics] = useState(null)
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')
  const [refreshingEvents, setRefreshingEvents] = useState(false)

  const loadActivity = useCallback(async () => {
    setRefreshingEvents(true)
    try {
      const response = await getAgentActivity()
      setEvents(response.data.data)
    } catch {
      setError('We could not load recent agent activity.')
    } finally {
      setRefreshingEvents(false)
    }
  }, [])

  useEffect(() => {
    getAnalyticsOverview().then((response) => setAnalytics(response.data.data)).catch(() => setError('We could not load the vendor dashboard.'))
    loadActivity()
  }, [loadActivity])

  const cards = analytics ? [
    ['Today’s revenue', formatCurrency(analytics.today.revenue)],
    ['Completed today', analytics.today.orderCount],
    ['Overall profit', formatCurrency(analytics.overall.profit)],
    ['Best seller', analytics.bestSeller ? `${analytics.bestSeller.name} (${analytics.bestSeller.quantity})` : 'No completed sales'],
  ] : []

  return (
    <Stack spacing={3}>
      <BoxTitle title="Good day, Warung Murni" subtitle="Here is a live overview of your completed sales." />
      {error && <Alert severity="error">{error}</Alert>}
      <Grid container spacing={2}>
        {cards.map(([label, value]) => <Grid key={label} size={{ xs: 6, lg: 3 }}><Card><CardContent><Typography color="text.secondary">{label}</Typography><Typography variant="h5" fontWeight={900}>{value}</Typography></CardContent></Card></Grid>)}
      </Grid>
      {analytics && <SalesChart dailySales={analytics.dailySales} />}
      {analytics?.lowStock.length > 0 && <Alert severity="warning">Low stock: {analytics.lowStock.map((item) => `${item.name} (${item.quantity} left)`).join(', ')}.</Alert>}
      <AgentActivityPanel events={events} onRefresh={loadActivity} refreshing={refreshingEvents} />
    </Stack>
  )
}

function SalesChart({ dailySales }) {
  const maximum = Math.max(...dailySales.map((day) => day.revenue), 1)
  return (
    <Card>
      <CardContent>
        <Typography fontWeight={800} mb={2}>Revenue: last 7 days</Typography>
        <Stack direction="row" spacing={1.5} alignItems="end" sx={{ height: 180 }}>
          {dailySales.map((day) => <Stack key={day.date} spacing={0.5} alignItems="center" sx={{ flex: 1, height: '100%', justifyContent: 'end' }}>
            <Typography variant="caption">{formatCurrency(day.revenue)}</Typography>
            <Box sx={{ width: '100%', maxWidth: 48, minHeight: 4, height: `${Math.max((day.revenue / maximum) * 120, 4)}px`, bgcolor: 'primary.main', borderRadius: 1 }} />
            <Typography variant="caption" color="text.secondary">{day.date.slice(5)}</Typography>
          </Stack>)}
        </Stack>
      </CardContent>
    </Card>
  )
}

function BoxTitle({ title, subtitle }) {
  return <Stack spacing={0.5}><Typography variant="h4" fontWeight={900}>{title}</Typography><Typography color="text.secondary">{subtitle}</Typography></Stack>
}

export default VendorDashboardPage
