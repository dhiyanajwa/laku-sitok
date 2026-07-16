import { Button, Paper, Stack, Typography } from '@mui/material'
import { useAuth } from '../../context/AuthContext'

function SettingsPage() {
  const { user, signOut } = useAuth()

  return <Stack spacing={3}>
    <Stack spacing={0.5}><Typography variant="h4" fontWeight={900}>Settings</Typography><Typography color="text.secondary">Manage this vendor session.</Typography></Stack>
    <Paper sx={{ p: 3 }}><Stack spacing={2}><Typography><strong>Signed in as:</strong> {user?.email}</Typography><Button variant="outlined" color="error" onClick={signOut} sx={{ alignSelf: 'flex-start' }}>Sign out</Button></Stack></Paper>
  </Stack>
}

export default SettingsPage
