import { useState } from 'react'
import { AppBar, Badge, Box, Button, Divider, Drawer, IconButton, List, ListItemButton, Stack, Toolbar, Tooltip, Typography } from '@mui/material'
import { NavLink, Outlet } from 'react-router-dom'
import { useThemeMode } from '../context/ThemeModeContext'
import VendorIcon from './VendorIcon'
import { playNewOrderChime, primeOrderSound, setOrderSoundEnabled } from '../services/order-chime'

const drawerWidth = 320
const navigation = [
  { label: 'Dashboard', to: '/vendor', icon: 'dashboard' },
  { label: 'Orders', to: '/vendor/orders', icon: 'orders' },
  { label: 'Kitchen', to: '/vendor/kitchen', icon: 'kitchen' },
  { label: 'Inventory', to: '/vendor/inventory', icon: 'inventory' },
  { label: 'AI Advisor', to: '/vendor/advisor', icon: 'advisor' },
  { label: 'Marketing', to: '/vendor/marketing', icon: 'marketing' },
  { label: 'Settings', to: '/vendor/settings', icon: 'settings' },
]

function Brand() {
  return <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}><Box sx={{ width: 44, height: 44, display: 'grid', placeItems: 'center', borderRadius: 1.4, bgcolor: 'var(--ls-primary)', color: '#fff', fontSize: 21, fontWeight: 900, boxShadow: '0 4px 10px rgba(0,112,78,.19)' }}>LS</Box><Box><Typography sx={{ color: 'var(--ls-text)', fontSize: 20, fontWeight: 900, lineHeight: 1.1 }}>Laku Sitok</Typography><Typography variant="body2" sx={{ mt: .25, color: 'var(--ls-text-muted)' }}>Vendor Portal</Typography></Box></Stack>
}

function Navigation({ onNavigate }) {
  return <List disablePadding sx={{ px: 1.75, py: 2.5 }}>{navigation.map((item) => <ListItemButton key={item.to} component={NavLink} to={item.to} end={item.to === '/vendor'} onClick={onNavigate} sx={{ minHeight: 54, mb: .55, px: 1.8, borderRadius: 1.6, gap: 1.8, color: 'var(--ls-text-muted)', '&.active': { bgcolor: 'var(--ls-primary-soft)', color: 'var(--ls-primary)' }, '&.active .nav-label': { fontWeight: 900 }, '&:hover': { bgcolor: 'var(--ls-surface-muted)' } }}><VendorIcon name={item.icon} size={24} /><Typography className="nav-label" sx={{ fontWeight: 700 }}>{item.label}</Typography></ListItemButton>)}</List>
}

function Sidebar({ mobile, open, onClose }) {
  const content = <Stack sx={{ height: '100%' }}><Box sx={{ minHeight: 80, px: 3.5, display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--ls-border-subtle)' }}><Brand /></Box><Navigation onNavigate={onClose} /><Box sx={{ mt: 'auto', px: 2.25, py: 2.5, borderTop: '1px solid var(--ls-border-subtle)' }}><Stack direction="row" spacing={1.4} sx={{ alignItems: 'center' }}><Box sx={{ width: 46, height: 46, display: 'grid', placeItems: 'center', borderRadius: '50%', bgcolor: 'var(--ls-surface-raised)', color: 'var(--ls-text-secondary)' }}>V</Box><Box><Typography sx={{ color: 'var(--ls-text)', fontWeight: 900 }}>Warung Murni</Typography><Typography variant="body2" sx={{ color: 'var(--ls-text-muted)' }}>Murni_Vendor_1</Typography></Box></Stack></Box></Stack>
  return <Drawer variant={mobile ? 'temporary' : 'permanent'} open={mobile ? open : true} onClose={onClose} ModalProps={{ keepMounted: true }} slotProps={{ paper: { sx: { width: drawerWidth, borderRight: '1px solid var(--ls-border-subtle)', bgcolor: 'var(--ls-surface)', boxSizing: 'border-box' } } }}>{content}</Drawer>
}

function VendorLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(localStorage.getItem('kds_sound_enabled') === 'true')
  const { mode, toggleMode } = useThemeMode()

  const primeSoundFromGesture = () => {
    if (soundEnabled) primeOrderSound().catch(() => {})
  }

  const handleToggleSound = async () => {
    const nextVal = !soundEnabled
    setSoundEnabled(nextVal)
    setOrderSoundEnabled(nextVal)
    if (nextVal && await primeOrderSound()) playNewOrderChime({ preview: true })
  }

  const modeLabel = mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'

  return <Box onPointerDownCapture={primeSoundFromGesture} sx={{ minHeight: '100vh', bgcolor: 'var(--ls-page)', color: 'var(--ls-text)' }}>
    <Box sx={{ display: { xs: 'none', md: 'block' } }}><Sidebar /></Box>
    <Box sx={{ display: { xs: 'block', md: 'none' } }}><Sidebar mobile open={mobileOpen} onClose={() => setMobileOpen(false)} /></Box>
    <AppBar position="fixed" color="inherit" elevation={0} sx={{ left: { md: drawerWidth }, width: { md: `calc(100% - ${drawerWidth}px)` }, bgcolor: 'var(--ls-surface)', color: 'var(--ls-text)', borderBottom: '1px solid var(--ls-border-subtle)', backdropFilter: 'blur(8px)' }}>
      <Toolbar sx={{ minHeight: '80px !important', px: { xs: 2, sm: 3.5 }, justifyContent: 'flex-end', gap: { xs: 1, sm: 1.6 } }}>
        <IconButton onClick={() => setMobileOpen(true)} sx={{ display: { md: 'none' }, mr: 'auto', color: 'var(--ls-text-secondary)' }}><VendorIcon name="dashboard" /></IconButton>
        <Button component={NavLink} to="/menu" variant="outlined" sx={{ borderColor: 'var(--ls-primary)', color: 'var(--ls-primary)', fontWeight: 900, fontSize: { xs: 11, sm: 13 }, borderRadius: 2.5, px: { xs: 1.5, sm: 2.25 }, py: .65, textTransform: 'none', whiteSpace: 'nowrap', '&:hover': { borderColor: 'var(--ls-primary)', bgcolor: 'var(--ls-primary-hover)' } }}>Customer menu</Button>
        <Tooltip title={modeLabel}><IconButton aria-label={modeLabel} onClick={toggleMode} sx={{ width: 42, height: 42, border: '1px solid var(--ls-border)', borderRadius: 2, color: 'var(--ls-purple)', bgcolor: 'var(--ls-purple-soft)', '&:hover': { bgcolor: 'var(--ls-surface-raised)' } }}><VendorIcon name={mode === 'dark' ? 'sun' : 'moon'} size={21} /></IconButton></Tooltip>
        <Button onClick={handleToggleSound} variant="outlined" sx={{ borderColor: '#f97316', color: '#f97316', fontWeight: 900, fontSize: { xs: 10, sm: 12 }, borderRadius: 2.5, px: { xs: 1.25, sm: 2 }, py: .65, textTransform: 'none', whiteSpace: 'nowrap', '&:hover': { borderColor: '#ea580c', bgcolor: 'rgba(249, 115, 22, 0.08)' } }}>{soundEnabled ? 'ORDER SOUND ON' : 'ORDER SOUND OFF'}</Button>
        <Divider orientation="vertical" flexItem sx={{ my: 2.2, borderColor: 'var(--ls-border)' }} />
        <IconButton aria-label="Notifications" sx={{ color: 'var(--ls-text-secondary)' }}><Badge color="success" variant="dot"><VendorIcon name="bell" size={23} /></Badge></IconButton>
      </Toolbar>
    </AppBar>
    <Box component="main" sx={{ ml: { md: `${drawerWidth}px` }, pt: { xs: 11, md: 13 }, px: { xs: 2, sm: 3.5, lg: 5 }, pb: { xs: 3, md: 5 }, minHeight: '100vh' }}><Outlet /></Box>
  </Box>
}

export default VendorLayout