import { useState } from 'react'
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

function LoginPage() {
  const { signIn, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to="/vendor" replace />

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const { error: signInError } = await signIn(email, password)
    setSubmitting(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

    navigate('/vendor')
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2, bgcolor: 'background.default' }}>
      <Paper component="form" onSubmit={handleSubmit} sx={{ width: '100%', maxWidth: 420, p: 4 }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h4" fontWeight={900}>Vendor login</Typography>
            <Typography color="text.secondary">Sign in to manage Warung Murni.</Typography>
          </Box>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
          <TextField label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" />
          <Button type="submit" variant="contained" size="large" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</Button>
        </Stack>
      </Paper>
    </Box>
  )
}

export default LoginPage
