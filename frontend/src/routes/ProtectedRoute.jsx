import { CircularProgress, Stack } from '@mui/material'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function ProtectedRoute() {
  const { loading, user } = useAuth()

  if (loading) {
    return <Stack sx={{ minHeight: '100vh' }} alignItems="center" justifyContent="center"><CircularProgress /></Stack>
  }

  return user ? <Outlet /> : <Navigate to="/vendor/login" replace />
}

export default ProtectedRoute
