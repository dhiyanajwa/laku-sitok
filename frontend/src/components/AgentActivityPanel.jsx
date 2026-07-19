import { useMemo, useState } from 'react'
import { Box, Button, Chip, IconButton, Paper, Stack, Typography } from '@mui/material'
import VendorIcon from './VendorIcon'

const filters = [['all', 'All'], ['kitchen', 'Kitchen'], ['inventory', 'Inventory'], ['bi', 'BI']]
const styles = {
  'Kitchen Agent': { label: 'KITCHEN AGENT', color: 'var(--ls-primary)' },
  'Inventory Agent': { label: 'INVENTORY AGENT', color: '#f59b0b' },
  'Business Intelligence Agent': { label: 'BUSINESS INTELLIGENCE AGENT', color: '#3b82f6' },
  'Business Advisor Agent': { label: 'BUSINESS ADVISOR AGENT', color: 'var(--ls-purple)' },
  'Order Agent': { label: 'ORDER AGENT', color: '#2563eb' },
  'Manager Agent': { label: 'MANAGER AGENT', color: 'var(--ls-purple)' },
}
const category = (agent) => agent === 'Kitchen Agent' ? 'kitchen' : agent === 'Inventory Agent' ? 'inventory' : ['Business Intelligence Agent', 'Business Advisor Agent'].includes(agent) ? 'bi' : 'other'
const getId = (event) => `${event.title || ''} ${event.detail || ''}`.match(/LS-[A-Za-z0-9-]+/i)?.[0] || event.id

function AgentActivityPanel({ events, onRefresh, refreshing }) {
  const [filter, setFilter] = useState('all')
  const [showIds, setShowIds] = useState(false)
  const shown = useMemo(() => filter === 'all' ? events : events.filter((event) => category(event.agent) === filter), [events, filter])

  return <Paper elevation={0} sx={{ p: { xs: 2.25, sm: 3.5 }, border: '1px solid #e3ebf2', borderRadius: 2.25 }}>
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2.25}><Box sx={{ maxWidth: 430 }}><Stack direction="row" alignItems="center" flexWrap="wrap" gap={1}><Typography sx={{ color: 'var(--ls-text)', fontSize: 22, fontWeight: 900 }}>Agent Activity</Typography><Chip label="Deterministic Ops" size="small" sx={{ bgcolor: '#eff3f7', color: 'var(--ls-text-secondary)', fontWeight: 800 }} /></Stack><Typography variant="body2" sx={{ mt: .7, color: 'var(--ls-text-muted)', lineHeight: 1.5 }}>Current backend session logs — tracking autonomous business operations and intelligence metrics.</Typography></Box><Stack spacing={1.25} alignItems={{ md: 'end' }}><Box sx={{ display: 'flex', p: .45, border: '1px solid #dbe5ee', borderRadius: 1.2, bgcolor: 'var(--ls-surface-muted)', gap: .25 }}>{filters.map(([key, label]) => <Button key={key} onClick={() => setFilter(key)} size="small" sx={{ minWidth: { xs: 55, sm: 66 }, px: 1.15, borderRadius: .9, bgcolor: filter === key ? 'var(--ls-surface)' : 'transparent', color: filter === key ? 'var(--ls-text)' : 'var(--ls-text-secondary)', boxShadow: filter === key ? '0 1px 3px rgba(40,64,85,.1)' : 'none', textTransform: 'none', fontWeight: filter === key ? 900 : 700 }}>{label}</Button>)}</Box><Stack direction="row" spacing={1}><Button variant={showIds ? 'contained' : 'outlined'} onClick={() => setShowIds((value) => !value)} sx={{ borderColor: 'var(--ls-border)', color: showIds ? '#fff' : 'var(--ls-text-secondary)', bgcolor: showIds ? 'var(--ls-text)' : 'var(--ls-surface)', textTransform: 'none', fontWeight: 900 }}>{showIds ? 'Hide IDs' : 'Show Session IDs'}</Button><IconButton aria-label="Refresh activity" onClick={onRefresh} disabled={refreshing} sx={{ width: 42, height: 42, border: '1px solid #dce6ee', borderRadius: 1.1, color: 'var(--ls-text-secondary)' }}><Box sx={{ display: 'grid', animation: refreshing ? 'agentSpin 1s linear infinite' : 'none', '@keyframes agentSpin': { to: { transform: 'rotate(360deg)' } } }}><VendorIcon name="refresh" size={21} /></Box></IconButton></Stack></Stack></Stack>
      <Box sx={{ borderTop: '1px solid #eaf0f5' }} />
      {!shown.length ? <Box sx={{ py: 6, textAlign: 'center' }}><Typography sx={{ color: 'var(--ls-text-secondary)', fontWeight: 800 }}>No activity for this agent category yet.</Typography></Box> : <Stack spacing={1.6} sx={{ maxHeight: 470, overflowY: 'auto', pr: .8, '&::-webkit-scrollbar': { width: 8 }, '&::-webkit-scrollbar-thumb': { bgcolor: '#9aa7b7', borderRadius: 5 } }}>{shown.map((event) => { const style = styles[event.agent] || { label: event.agent?.toUpperCase() || 'SYSTEM', color: '#64748b' }; return <Box key={event.id} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr auto', sm: '230px minmax(0,1fr) auto' }, gap: { xs: 1.1, sm: 2 }, alignItems: 'center', p: { xs: 1.7, sm: 2.1 }, border: '1px solid #e5edf3', borderRadius: 1.75, bgcolor: 'var(--ls-surface)' }}><Box sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}><Box sx={{ display: 'inline-flex', px: 1.35, py: .65, borderRadius: .75, bgcolor: style.color, color: '#fff', fontSize: 12, fontWeight: 900 }}>{style.label}</Box></Box><Box sx={{ minWidth: 0 }}><Typography sx={{ color: 'var(--ls-text)', fontWeight: 900 }}>{event.title}</Typography><Typography variant="body2" sx={{ mt: .25, color: 'var(--ls-text-secondary)', lineHeight: 1.45 }}>{event.detail}</Typography>{showIds && <Box sx={{ mt: .85, display: 'inline-flex', alignItems: 'center', gap: .65, px: 1, py: .35, border: '1px solid #dce6ee', borderRadius: .7, bgcolor: '#f2f6fa', color: 'var(--ls-text-secondary)', fontFamily: 'monospace', fontSize: 11, fontWeight: 800 }}><span>›_</span>{getId(event)}</Box>}</Box><Stack direction="row" alignItems="center" spacing={1}><Box sx={{ px: 1, py: .5, borderRadius: .7, bgcolor: 'var(--ls-surface-muted)', color: 'var(--ls-text-muted)', fontSize: 12, fontWeight: 900, whiteSpace: 'nowrap' }}>{new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Box><Box sx={{ color: 'var(--ls-text-muted)', display: 'grid' }}>↗</Box></Stack></Box> })}</Stack>}
    </Stack>
  </Paper>
}

export default AgentActivityPanel
