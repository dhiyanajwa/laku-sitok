import { useEffect, useState } from 'react'
import { Alert, Box, Button, Chip, CircularProgress, Stack, Typography } from '@mui/material'
import { QRCodeSVG } from 'qrcode.react'
import { Link as RouterLink } from 'react-router-dom'
import { getHealth } from '../services/api'

function WelcomePage() {
  const [health, setHealth] = useState({ loading: true, status: '', message: '' })

  async function checkApi() {
    setHealth({ loading: true, status: '', message: '' })

    try {
      const { data } = await getHealth()
      setHealth({ loading: false, status: data.status, message: data.message })
    } catch {
      setHealth({
        loading: false,
        status: 'error',
        message: 'The API is not available. Start the backend on port 5000.',
      })
    }
  }

  useEffect(() => {
    checkApi()
  }, [])

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', px: 3, py: { xs: 8, md: 14 } }}>
      <Stack spacing={3} alignItems="flex-start">
        <Chip label="Customer ordering" color="primary" />
        <Typography component="h1" variant="h2" fontWeight={800}>Laku Sitok</Typography>
        <Typography variant="h5" color="text.secondary">A simple operating system for micro-businesses.</Typography>
        <Typography color="text.secondary">Scan the QR code or open the menu to place an order.</Typography>
        <QRCodeSVG value={`${window.location.origin}/menu`} size={160} includeMargin />
        <Button component={RouterLink} to="/menu" variant="contained">Open customer menu</Button>
        {health.loading ? (
          <Stack direction="row" spacing={1.5} alignItems="center">
            <CircularProgress size={20} />
            <Typography>Checking API connection...</Typography>
          </Stack>
        ) : (
          <Alert severity={health.status === 'ok' ? 'success' : 'error'} sx={{ width: '100%' }}>{health.message}</Alert>
        )}
        <Button variant="outlined" onClick={checkApi} disabled={health.loading}>Check API again</Button>
      </Stack>
    </Box>
  )
}

export default WelcomePage
