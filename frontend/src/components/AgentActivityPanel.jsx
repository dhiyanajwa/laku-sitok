import { Box, Button, Card, CardContent, Chip, Divider, Stack, Typography } from '@mui/material'

const agentColors = {
  'Manager Agent': 'secondary',
  'Order Agent': 'primary',
  'Inventory Agent': 'warning',
  'Kitchen Agent': 'success',
  'Business Intelligence Agent': 'info',
  'Business Advisor Agent': 'secondary',
}

function AgentActivityPanel({ events, onRefresh, refreshing }) {
  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
            <Box><Typography fontWeight={800}>Agent activity</Typography><Typography variant="body2" color="text.secondary">Current backend session — deterministic operations, with AI only for Business Advisor answers.</Typography></Box>
            <Button size="small" onClick={onRefresh} disabled={refreshing}>Refresh</Button>
          </Stack>
          {events.length === 0 ? <Typography color="text.secondary">No activity yet. Create an order, update stock, complete an order, or ask the advisor.</Typography> : (
            <Stack divider={<Divider flexItem />}>
              {events.map((event) => <Stack key={event.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} py={1.25}>
                <Chip size="small" label={event.agent} color={agentColors[event.agent] || 'default'} sx={{ alignSelf: 'flex-start' }} />
                <Box sx={{ flex: 1 }}><Typography fontWeight={700}>{event.title}</Typography><Typography variant="body2" color="text.secondary">{event.detail}</Typography></Box>
                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>{new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Typography>
              </Stack>)}
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}

export default AgentActivityPanel
