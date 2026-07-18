import { AppBar, Box, Button, Drawer, List, ListItemButton, ListItemText, Toolbar, Typography } from '@mui/material'
import { NavLink, Outlet } from 'react-router-dom'

const navigation = [
  { label: 'Dashboard', to: '/vendor' },
  { label: 'Orders', to: '/vendor/orders' },
  { label: 'Kitchen', to: '/vendor/kitchen' },
  { label: 'Inventory', to: '/vendor/inventory' },
  { label: 'AI Advisor', to: '/vendor/advisor' },
  { label: 'Marketing', to: '/vendor/marketing' },
  { label: 'Settings', to: '/vendor/settings' },
]

function VendorLayout() {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="fixed" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography color="primary" fontWeight={900} variant="h6">Laku Sitok</Typography>
          <Typography sx={{ ml: 1.5 }} color="text.secondary">Vendor Portal</Typography>
          <Button component={NavLink} to="/menu" sx={{ ml: 'auto' }}>Customer menu</Button>
        </Toolbar>
      </AppBar>
      <Drawer variant="permanent" sx={{ width: 220, flexShrink: 0, display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: 220, boxSizing: 'border-box', pt: 8 } }}>
        <List>
          {navigation.map((item) => (
            <ListItemButton key={item.to} component={NavLink} to={item.to} end={item.to === '/vendor'} sx={{ '&.active': { bgcolor: 'primary.light', color: 'primary.contrastText' } }}>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>
      <Box component="main" sx={{ flex: 1, pt: 10, px: { xs: 2, md: 4 }, pb: 4 }}>
        <Outlet />
      </Box>
    </Box>
  )
}

export default VendorLayout


