import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { updateStallOverride } from '../services/api'
import VendorIcon from './VendorIcon'

function toLocalDateTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

function countdown(value) {
  const difference = new Date(value).getTime() - Date.now()
  if (!Number.isFinite(difference) || difference <= 0) return 'Updating…'
  const minutes = Math.ceil(difference / 60000)
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (!hours) return `in ${remainingMinutes}m`
  return `in ${hours}h${remainingMinutes ? ` ${remainingMinutes}m` : ''}`
}

function timeLabel(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-MY', { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

function StallAvailabilityCard({ availability, onChanged }) {
  const navigate = useNavigate()
  const [now, setNow] = useState(Date.now())
  const [dialogMode, setDialogMode] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000)
    return () => window.clearInterval(timer)
  }, [])

  const state = useMemo(() => {
    if (!availability) return { heading: 'Checking stall availability…', detail: 'Loading your saved opening hours.', open: false }
    if (!availability.scheduleConfigured) return { heading: 'Schedule needed', detail: 'Set opening and closing times before customer ordering can begin.', open: false }
    if (availability.isOpen) return { heading: 'Open now', detail: availability.nextChangeAt ? `Customer ordering is active. Closes ${countdown(availability.nextChangeAt)}.` : 'Customer ordering is active.', open: true }
    if (availability.source === 'manual') return { heading: 'Temporarily closed', detail: availability.nextChangeAt ? `Customer ordering is paused until ${timeLabel(availability.nextChangeAt)}.` : 'Customer ordering is paused.', open: false }
    return { heading: 'Closed', detail: availability.nextChangeAt ? `Customer ordering opens ${countdown(availability.nextChangeAt, now)}.` : 'Customer ordering is unavailable.', open: false }
  }, [availability, now])

  function beginOverride(mode) {
    setError('')
    setDialogMode(mode)
    setExpiresAt(toLocalDateTime(availability?.suggestedOverrideExpiresAt))
  }

  async function saveOverride() {
    setSaving(true)
    setError('')
    try {
      const response = await updateStallOverride({ mode: dialogMode, expiresAt: new Date(expiresAt).toISOString() })
      onChanged(response.data.data)
      setDialogMode('')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not update the stall status.')
    } finally {
      setSaving(false)
    }
  }

  async function clearOverride() {
    setSaving(true)
    setError('')
    try {
      const response = await updateStallOverride({ mode: 'clear' })
      onChanged(response.data.data)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not return to the regular schedule.')
    } finally {
      setSaving(false)
    }
  }

  const actionMode = availability?.isOpen ? 'closed' : 'open'
  const actionLabel = availability?.isOpen ? 'Close temporarily' : 'Open now'
  const dialogTitle = dialogMode === 'open' ? 'Open stall temporarily' : 'Close stall temporarily'

  return <Paper elevation={0} sx={{ p: { xs: 2.15, sm: 2.5 }, border: '1px solid var(--ls-border)', borderRadius: 2.25, bgcolor: 'var(--ls-surface)', boxShadow: '0 2px 5px rgba(30,55,80,.03)' }}>
    <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between" spacing={2}>
      <Stack direction="row" spacing={1.45} alignItems="center">
        <Box sx={{ width: 46, height: 46, display: 'grid', placeItems: 'center', borderRadius: 1.5, bgcolor: state.open ? 'var(--ls-primary-soft)' : 'var(--ls-surface-raised)', color: state.open ? 'var(--ls-primary)' : 'var(--ls-text-secondary)' }}><VendorIcon name="clock" size={23} /></Box>
        <Box><Stack direction="row" spacing={.9} alignItems="center"><Typography sx={{ color: 'var(--ls-text)', fontSize: 16, fontWeight: 900 }}>Stall status</Typography>{availability?.source === 'manual' && <Box sx={{ px: .9, py: .35, borderRadius: 4, bgcolor: 'var(--ls-purple-soft)', color: 'var(--ls-purple)', fontSize: 10, textTransform: 'uppercase', letterSpacing: .45, fontWeight: 900 }}>Manual override</Box>}</Stack><Typography sx={{ mt: .35, color: state.open ? 'var(--ls-primary)' : 'var(--ls-text-secondary)', fontSize: 14, fontWeight: 800 }}>{state.heading}</Typography><Typography variant="body2" sx={{ mt: .2, color: 'var(--ls-text-muted)' }}>{state.detail}</Typography></Box>
      </Stack>
      {availability?.scheduleConfigured ? <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.1} sx={{ width: { xs: '100%', md: 'auto' } }}>
        <Button onClick={() => beginOverride(actionMode)} disabled={saving} variant="contained" sx={{ minHeight: 44, bgcolor: state.open ? '#a55f00' : 'var(--ls-primary)', color: '#fff', textTransform: 'none', fontWeight: 900, '&:hover': { bgcolor: state.open ? '#844c00' : '#006c51' } }}>{actionLabel}</Button>
        {availability?.source === 'manual' && <Button onClick={clearOverride} disabled={saving} variant="outlined" sx={{ minHeight: 44, borderColor: 'var(--ls-border)', color: 'var(--ls-text-secondary)', textTransform: 'none', fontWeight: 900 }}>Return to schedule</Button>}
      </Stack> : <Button onClick={() => navigate('/vendor/settings')} variant="contained" sx={{ minHeight: 44, bgcolor: 'var(--ls-primary)', textTransform: 'none', fontWeight: 900 }}>Set opening hours</Button>}
    </Stack>
    {error && <Alert severity="error" sx={{ mt: 1.75 }}>{error}</Alert>}
    <Dialog open={Boolean(dialogMode)} onClose={() => !saving && setDialogMode('')} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ color: 'var(--ls-text)', fontWeight: 900 }}>{dialogTitle}</DialogTitle>
      <DialogContent><Stack spacing={1.5} sx={{ pt: .5 }}><Typography sx={{ color: 'var(--ls-text-secondary)' }}>{dialogMode === 'open' ? 'Customer ordering will be available until the time you choose.' : 'Customer ordering will pause until the time you choose.'}</Typography><Box><Typography sx={{ mb: .65, color: 'var(--ls-text-muted)', fontSize: 12, fontWeight: 900 }}>END TIME</Typography><Box component="input" type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} sx={{ width: '100%', minHeight: 48, boxSizing: 'border-box', px: 1.25, border: '1px solid var(--ls-border)', borderRadius: 1.25, bgcolor: 'var(--ls-surface-muted)', color: 'var(--ls-text)', font: 'inherit', colorScheme: 'light dark' }} /></Box></Stack></DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}><Button onClick={() => setDialogMode('')} disabled={saving} sx={{ color: 'var(--ls-text-secondary)', textTransform: 'none', fontWeight: 800 }}>Cancel</Button><Button onClick={saveOverride} disabled={saving || !expiresAt} variant="contained" sx={{ bgcolor: 'var(--ls-primary)', textTransform: 'none', fontWeight: 900 }}>{saving ? 'Saving…' : dialogMode === 'open' ? 'Open stall' : 'Pause ordering'}</Button></DialogActions>
    </Dialog>
  </Paper>
}

export default StallAvailabilityCard