import { useState } from 'react'
import { Alert, Box, Button, Chip, CircularProgress, Paper, Stack, TextField, Typography } from '@mui/material'
import { askAdvisor } from '../../services/api'
import VendorIcon from '../../components/VendorIcon'

const suggestions = [
  { label: 'How was my business today?', icon: 'spark' },
  { label: 'What should I prepare tomorrow?', icon: 'inventory' },
  { label: 'Which product is most profitable?', icon: 'layers' },
  { label: 'How can I increase sales?', icon: 'spark' },
]

function AdvisorPage() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [lastQuestion, setLastQuestion] = useState('')
  const [remainingRequests, setRemainingRequests] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
async function submitQuestion(event) {
    event?.preventDefault()
    const request = question.trim()
    if (!request || submitting) return
    setSubmitting(true)
    setError('')
    setAnswer('')
    try {
      const response = await askAdvisor(request)
      setAnswer(response.data.data.answer)
      setLastQuestion(request)
      setRemainingRequests(response.data.data.remainingRequests)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We could not reach the AI advisor. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function chooseSuggestion(value) {
    setQuestion(value)
    setAnswer('')
    setError('')
  }

  return <Stack spacing={3.25} sx={{ maxWidth: 1180, mx: 'auto', pb: 5 }}>
    <Paper elevation={0} sx={{ overflow: 'hidden', p: { xs: 2.5, sm: 3.25 }, borderRadius: 2.25, color: '#fff', background: 'linear-gradient(112deg, #43106d, #101a31 78%)', boxShadow: '0 12px 24px rgba(36,18,75,.16)' }}><Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2.5} alignItems={{ md: 'center' }}><Box><Stack direction="row" spacing={1} alignItems="center"><Box sx={{ px: 1, py: .42, border: '1px solid rgba(218,183,255,.35)', borderRadius: 1, color: '#e8d7ff', fontSize: 10, letterSpacing: .45, fontWeight: 900 }}>GROUNDED ADVISORY SYSTEM (V2.1)</Box><Box sx={{ display: 'flex', alignItems: 'center', gap: .55, px: .9, py: .42, borderRadius: 1, bgcolor: 'rgba(21,189,150,.2)', color: '#74edd0', fontSize: 10, fontWeight: 900 }}><Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#2de0ae' }} />Data Synced</Box></Stack><Stack direction="row" spacing={1.1} alignItems="center" sx={{ mt: 1.3 }}><Typography component="h1" sx={{ fontSize: { xs: 30, sm: 34 }, lineHeight: 1.05, fontWeight: 900 }}>AI Business Advisor</Typography><Box sx={{ color: '#5fc0ff', display: 'grid' }}><VendorIcon name="advisor" size={34} strokeWidth={1.7} /></Box></Stack><Typography sx={{ mt: .85, maxWidth: 590, color: '#e7ddf8', fontSize: 13.5, lineHeight: 1.45 }}>Ask for practical advice backed by your local database transactions, completed sales, and real-time inventory counts.</Typography></Box><Stack direction="row" spacing={.7} alignItems="center" sx={{ alignSelf: { xs: 'flex-start', md: 'center' }, px: 1.1, py: .7, border: '1px solid rgba(255,255,255,.16)', borderRadius: 4, bgcolor: 'rgba(255,255,255,.08)' }}><Box sx={{ color: '#d69aff', display: 'grid' }}><VendorIcon name="layers" size={16} /></Box><Typography sx={{ fontSize: 11, fontWeight: 900 }}>Grounding: <Box component="span" sx={{ color: '#d7c6ff' }}>High</Box></Typography></Stack></Stack></Paper>

    <Box>
      <Stack spacing={3}>
        <Box><Typography sx={{ color: 'var(--ls-text-muted)', fontSize: 11, letterSpacing: .7, fontWeight: 900 }}>SUGGESTED QUESTIONS</Typography><Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1.25 }}>{suggestions.map((suggestion) => <Chip key={suggestion.label} label={suggestion.label} onClick={() => chooseSuggestion(suggestion.label)} icon={<VendorIcon name={suggestion.icon} size={15} />} sx={{ height: 35, border: '1px solid #dce6ef', borderRadius: 3, bgcolor: question === suggestion.label ? '#f5edff' : '#fff', color: question === suggestion.label ? 'var(--ls-purple)' : '#273e5d', fontWeight: 800, '& .MuiChip-icon': { color: question === suggestion.label ? 'var(--ls-purple)' : 'var(--ls-purple)' }, '&:hover': { bgcolor: '#f7f1ff' } }} />)}</Stack></Box>

        <Paper component="form" onSubmit={submitQuestion} elevation={0} sx={{ p: { xs: 2, sm: 3 }, border: '1px solid #dfe8f0', borderRadius: 2.25, bgcolor: 'var(--ls-surface)' }}><Stack spacing={2}><Box sx={{ p: { xs: 1.5, sm: 2 }, border: '1px solid #dce6ef', borderRadius: 1.5, bgcolor: 'var(--ls-surface-muted)' }}><Typography sx={{ color: 'var(--ls-text-muted)', fontSize: 10.5, fontWeight: 900, letterSpacing: .5 }}>YOUR BUSINESS QUESTION</Typography><TextField value={question} onChange={(event) => setQuestion(event.target.value)} multiline minRows={3} placeholder="e.g. Can you suggest bundles based on my stock levels?" inputProps={{ maxLength: 280, 'aria-label': 'Your business question' }} variant="standard" fullWidth sx={{ mt: .8, '& .MuiInputBase-root': { color: '#263e5c', fontSize: 14 }, '& .MuiInputBase-input::placeholder': { color: '#93a4bf', opacity: 1 }, '& .MuiInput-underline:before, & .MuiInput-underline:after': { borderBottom: 0 } }} /><Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pt: 1.1, mt: 1, borderTop: '1px solid #edf1f5' }}><Typography sx={{ color: 'var(--ls-text-muted)', fontSize: 10.5, fontWeight: 800 }}>{question.length}/280 characters</Typography><Button type="submit" variant="contained" disabled={submitting || !question.trim()} startIcon={submitting ? <CircularProgress size={15} color="inherit" /> : <VendorIcon name="spark" size={16} />} sx={{ minWidth: 128, borderRadius: 1.3, bgcolor: 'var(--ls-purple)', fontSize: 12, fontWeight: 900, textTransform: 'none', '&.Mui-disabled': { bgcolor: '#edf2f7', color: '#9cacc2' }, '&:hover': { bgcolor: '#741fca' } }}>{submitting ? 'Checking...' : 'Ask advisor'}</Button></Stack></Box><Alert severity="info" icon={<VendorIcon name="advisor" size={19} />} sx={{ border: '1px solid #ead9ff', borderRadius: 1.5, bgcolor: '#fcf9ff', color: '#6b21a8', '& .MuiAlert-icon': { color: 'var(--ls-purple)' } }}>Advice is dynamically built on completed-order analytics and current inventory levels only. Free-model requests are verified automatically.</Alert></Stack></Paper>

        {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
        {answer && <Box><Typography sx={{ color: 'var(--ls-text-muted)', fontSize: 11, letterSpacing: .7, fontWeight: 900, mb: 1.25 }}>GENERATED ADVISOR INSIGHTS</Typography><Paper elevation={0} sx={{ p: { xs: 2.25, sm: 3 }, border: '1px solid #dfe8f0', borderRadius: 2.25, bgcolor: 'var(--ls-surface)' }}><Stack spacing={2}><Box><Stack direction="row" justifyContent="space-between" alignItems="center"><Typography sx={{ color: 'var(--ls-text-muted)', fontSize: 10.5, fontWeight: 900, letterSpacing: .45 }}>QUERY CONTEXT</Typography><Box sx={{ px: .9, py: .45, borderRadius: .8, bgcolor: 'var(--ls-surface-muted)', color: '#7890ad', fontSize: 10 }}>Current request</Box></Stack><Typography sx={{ mt: .8, color: 'var(--ls-text)', fontWeight: 900 }}>&quot;{lastQuestion}&quot;</Typography></Box><Box sx={{ pt: 2, borderTop: '1px solid #edf1f5' }}><Typography sx={{ color: '#263e5c', whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.65 }}>{answer}</Typography></Box><Paper elevation={0} sx={{ p: 1.6, border: '1px solid #dfe8f0', borderRadius: 1.4, bgcolor: 'var(--ls-surface-muted)' }}><Typography sx={{ color: '#53708e', fontSize: 10.5, fontWeight: 900 }}>DATABASE VERIFICATION FOOTPRINTS:</Typography><Stack direction="row" flexWrap="wrap" gap={.75} sx={{ mt: 1 }}><Chip size="small" label="Live Sales Log" sx={{ bgcolor: 'var(--ls-surface)', border: '1px solid #ead9ff', color: 'var(--ls-purple)', fontSize: 10, fontWeight: 800 }} /><Chip size="small" label="Inventory Master Stock Ledger" sx={{ bgcolor: 'var(--ls-surface)', border: '1px solid #ead9ff', color: 'var(--ls-purple)', fontSize: 10, fontWeight: 800 }} /></Stack></Paper>{remainingRequests !== null && <Typography sx={{ color: 'var(--ls-text-muted)', fontSize: 11 }}>{remainingRequests} advisor questions remaining in this 15-minute window.</Typography>}</Stack></Paper></Box>}
      </Stack>
    </Box>
  </Stack>
}

export default AdvisorPage