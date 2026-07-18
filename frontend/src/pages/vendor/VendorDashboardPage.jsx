import { useCallback, useEffect, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Grid, Stack, Typography } from '@mui/material'
import AgentActivityPanel from '../../components/AgentActivityPanel'
import ManagerDrawer from '../../components/ManagerDrawer'
import { getAgentActivity, getAnalyticsOverview } from '../../services/api'

const formatCurrency = (amount) => new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(amount)

function VendorDashboardPage() {
  const [analytics, setAnalytics] = useState(null)
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')
  const [refreshingEvents, setRefreshingEvents] = useState(false)
  const [managerOpen, setManagerOpen] = useState(false)

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
    ['Today\'s revenue', formatCurrency(analytics.today.revenue)],
    ['Completed today', analytics.today.orderCount],
    ['Overall profit', formatCurrency(analytics.overall.profit)],
    ['Best seller', analytics.bestSeller ? `${analytics.bestSeller.name} (${analytics.bestSeller.quantity})` : 'No completed sales'],
  ] : []

  return <Stack spacing={3}>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2} alignItems={{ sm: 'center' }}><BoxTitle title="Good day, Warung Murni" subtitle="Here is a live overview of your completed sales." /><Button variant="contained" color="secondary" onClick={() => setManagerOpen(true)}>Ask Manager</Button></Stack>
    {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
    <Grid container spacing={2}>
      {cards.map(([label, value]) => <Grid key={label} size={{ xs: 6, lg: 3 }}><Card><CardContent><Typography color="text.secondary">{label}</Typography><Typography variant="h5" fontWeight={900}>{value}</Typography></CardContent></Card></Grid>)}
    </Grid>
    {analytics && <SalesChart dailySales={analytics.dailySales} />}
    {analytics?.lowStock.length > 0 && <Alert severity="warning">Low stock: {analytics.lowStock.map((item) => `${item.name} (${item.quantity} left)`).join(', ')}.</Alert>}
    {analytics?.canStillMake?.map((item) => item.recipeComplete ? <Alert key={item.productId} severity={item.estimatedAvailable === 0 ? 'error' : 'info'}>Can still make: {item.estimatedAvailable} serving(s){item.limitingIngredients.length ? ` — limited by ${item.limitingIngredients.map((ingredient) => ingredient.name).join(', ')}.` : '.'}</Alert> : <Alert key={item.productId} severity="warning">A recipe product needs a complete recipe before Laku Sitok can estimate availability.</Alert>)}
    {analytics?.ingredientLowStock?.length > 0 && <Alert severity="warning">Low ingredients: {analytics.ingredientLowStock.map((item) => `${item.name} (${item.quantity} ${item.unit} left)`).join(', ')}.</Alert>}
    <AgentActivityPanel events={events} onRefresh={loadActivity} refreshing={refreshingEvents} />
    <ManagerDrawer open={managerOpen} onClose={() => setManagerOpen(false)} />
  </Stack>
}

function SalesChart({ dailySales }) {
  const maximum = Math.max(...dailySales.map((day) => day.revenue), 1)
  return <Card><CardContent><Typography fontWeight={800} mb={2}>Revenue: last 7 days</Typography><Stack direction="row" spacing={1.5} alignItems="end" sx={{ height: 180 }}>{dailySales.map((day) => <Stack key={day.date} spacing={0.5} alignItems="center" sx={{ flex: 1, height: '100%', justifyContent: 'end' }}><Typography variant="caption">{formatCurrency(day.revenue)}</Typography><Box sx={{ width: '100%', maxWidth: 48, minHeight: 4, height: `${Math.max((day.revenue / maximum) * 120, 4)}px`, bgcolor: 'primary.main', borderRadius: 1 }} /><Typography variant="caption" color="text.secondary">{day.date.slice(5)}</Typography></Stack>)}</Stack></CardContent></Card>
}

function BoxTitle({ title, subtitle }) {
  return <Stack spacing={0.5}><Typography variant="h4" fontWeight={900}>{title}</Typography><Typography color="text.secondary">{subtitle}</Typography></Stack>
}

export default VendorDashboardPage