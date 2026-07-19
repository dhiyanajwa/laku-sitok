import { useState } from 'react'
import { Box, Chip, InputBase, Paper, Stack, Typography } from '@mui/material'

function unique(values, maxItems) {
  return [...new Set(values.map((value) => String(value || '').trim().replace(/^#/, '')).filter(Boolean))].slice(0, maxItems)
}

function MarketingTagField({ label, value, onChange, placeholder, helperText, color = 'teal', maxItems = 8 }) {
  const [draft, setDraft] = useState('')
  const palette = color === 'purple'
    ? { border: '#ead4ff', background: '#fbf7ff', chipBackground: '#f7efff', chipBorder: '#dcbbff', chipText: 'var(--ls-purple)' }
    : { border: '#b9f0e5', background: '#f6fffd', chipBackground: '#e9fffa', chipBorder: '#93e9d9', chipText: '#007b6a' }

  function commit(rawValue = draft) {
    const additions = String(rawValue).split(',')
    if (additions.some((item) => item.trim())) onChange(unique([...(value || []), ...additions], maxItems))
    setDraft('')
  }

  function remove(item) {
    onChange((value || []).filter((entry) => entry !== item))
  }

  return <Box>
    <Typography sx={{ mb: .9, color: 'var(--ls-text-muted)', fontSize: 11, fontWeight: 900, letterSpacing: .35, textTransform: 'uppercase' }}>{label}</Typography>
    <Paper elevation={0} sx={{ minHeight: 92, p: 1.25, borderRadius: 1.65, border: '1px solid', borderColor: palette.border, bgcolor: palette.background }}>
      <Stack direction="row" flexWrap="wrap" gap={.8} alignItems="center">
        {(value || []).map((item) => <Chip key={item} label={color === 'purple' ? `#${item}` : item} onDelete={() => remove(item)} size="small" sx={{ height: 28, bgcolor: palette.chipBackground, border: '1px solid', borderColor: palette.chipBorder, color: palette.chipText, fontWeight: 800, '& .MuiChip-deleteIcon': { color: palette.chipText } }} />)}
        {(value || []).length < maxItems && <InputBase value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); commit() } }} onBlur={() => commit()} placeholder={placeholder} sx={{ minWidth: 180, flex: 1, px: .3, color: 'var(--ls-text-secondary)', fontSize: 13, '& input::placeholder': { color: 'var(--ls-text-muted)', opacity: 1 } }} />}
      </Stack>
    </Paper>
    {helperText && <Typography sx={{ mt: .8, color: 'var(--ls-text-muted)', fontSize: 11, fontStyle: 'italic' }}>{helperText}</Typography>}
  </Box>
}

export default MarketingTagField