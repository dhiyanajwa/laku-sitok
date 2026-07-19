import { Alert, Box, Button, Divider, Drawer, IconButton, Stack, Typography } from '@mui/material'
import { MenuIcon, ProductIllustration } from './MenuVisuals'

const formatCurrency = (amount) => new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(amount)

function QuantityButton({ label, icon, onClick, disabled }) {
  return <IconButton aria-label={label} onClick={onClick} disabled={disabled} size="small" sx={{ width: 30, height: 30, border: '1px solid #dbe4ed', borderRadius: 1.1, color: '#34506e' }}><MenuIcon name={icon} size={15} strokeWidth={2.2} /></IconButton>
}

function CartDrawer({ cartItems, error, orderingAvailable, availabilityMessage, onClose, onQuantityChange, onCheckout, open, submitting }) {
  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  return <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100vw', sm: 558 }, maxWidth: '100vw', left: { xs: 0, sm: 'auto' }, bgcolor: '#fff' } } }}>
    <Stack sx={{ height: '100%' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: { xs: 2.5, sm: 3.25 }, py: 2.75, bgcolor: '#f8fafc', borderBottom: '1px solid #edf1f5' }}>
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <Box sx={{ color: '#007b5b', display: 'grid', placeItems: 'center' }}><MenuIcon name="bag" size={25} strokeWidth={2} /></Box>
          <Typography variant="h5" sx={{ fontSize: { xs: 21, sm: 23 }, color: '#10244a', fontWeight: 900 }}>Your Basket</Typography>
          <Box sx={{ px: 1.25, py: .4, borderRadius: 3, bgcolor: '#d9faec', color: '#007b5b', fontSize: 13, fontWeight: 800 }}>{itemCount} {itemCount === 1 ? 'item' : 'items'}</Box>
        </Stack>
        <IconButton aria-label="Close basket" onClick={onClose} sx={{ color: '#8aa0b9' }}><MenuIcon name="close" size={24} /></IconButton>
      </Stack>

      <Stack spacing={2} sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, sm: 3.25 } }}>
        {error && <Alert severity="error">{error}</Alert>}{!orderingAvailable && <Alert severity="info">{availabilityMessage || 'Ordering is currently unavailable.'}</Alert>}
        {!cartItems.length ? <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ minHeight: 280, color: '#66809b' }}><Box sx={{ p: 2, borderRadius: '50%', bgcolor: '#ecf9f3', color: '#078361' }}><MenuIcon name="bag" size={34} /></Box><Typography fontWeight={800}>Your basket is empty</Typography><Typography variant="body2" textAlign="center">Add something fresh from the menu to get started.</Typography></Stack> : cartItems.map((item) => <Box key={item.id} sx={{ border: '1px solid #e5edf3', borderRadius: 2, bgcolor: '#f8fafc', p: { xs: 1.75, sm: 2.25 } }}>
          <Stack direction="row" spacing={1.75} alignItems="start">
            <Box sx={{ p: .8, borderRadius: 1.4, border: '1px solid #dce5ee', bgcolor: '#fff' }}><ProductIllustration product={item} size="small" /></Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction="row" justifyContent="space-between" spacing={1}><Box sx={{ minWidth: 0 }}><Typography noWrap sx={{ color: '#10244a', fontWeight: 900 }}>{item.name}</Typography><Typography variant="caption" sx={{ color: '#4c6683', fontWeight: 700, textTransform: 'uppercase' }}>{item.category || 'Menu item'}</Typography></Box><IconButton aria-label={`Remove ${item.name} from basket`} onClick={() => onQuantityChange(item.id, 0)} size="small" sx={{ color: '#8aa0b9', mt: -.5, mr: -.75 }}><MenuIcon name="trash" size={18} /></IconButton></Stack>
              <Divider sx={{ my: 1.1, borderColor: '#e4ebf1' }} />
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                <Stack direction="row" alignItems="center" spacing={.75}><QuantityButton label={`Remove one ${item.name}`} icon="minus" onClick={() => onQuantityChange(item.id, item.quantity - 1)} /><Typography sx={{ minWidth: 18, textAlign: 'center', color: '#10244a', fontWeight: 800 }}>{item.quantity}</Typography><QuantityButton label={`Add one ${item.name}`} icon="plus" onClick={() => onQuantityChange(item.id, item.quantity + 1)} disabled={item.quantity >= item.stock} /></Stack>
                <Typography sx={{ color: '#007b5b', fontWeight: 900, fontSize: 18 }}>{formatCurrency(item.price * item.quantity)}</Typography>
              </Stack>
            </Box>
          </Stack>
        </Box>)}
      </Stack>

      <Box sx={{ px: { xs: 2.5, sm: 3.25 }, pt: 2.4, pb: { xs: 2.5, sm: 2.75 }, bgcolor: '#f8fafc', borderTop: '1px solid #edf1f5' }}>
        <Stack spacing={1.15} sx={{ color: '#526b89', fontSize: 14 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', columnGap: 3 }}><Typography variant="body2">Vendor</Typography><Typography variant="body2" sx={{ justifySelf: 'end', color: '#10244a', fontWeight: 800 }}>Warung Murni</Typography></Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', columnGap: 3 }}><Typography variant="body2">Laku Sitok Platform Fee</Typography><Typography variant="body2" sx={{ justifySelf: 'end', color: '#008764', fontWeight: 800 }}>FREE</Typography></Box>
          <Divider sx={{ borderStyle: 'dashed', borderColor: '#dce5ee', my: .45 }} />
          <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', columnGap: 3 }}><Typography sx={{ color: '#10244a', fontWeight: 900 }}>Subtotal</Typography><Typography sx={{ justifySelf: 'end', color: '#007b5b', fontSize: 23, fontWeight: 900 }}>{formatCurrency(total)}</Typography></Box>
          <Button fullWidth variant="contained" size="large" disabled={!cartItems.length || submitting || !orderingAvailable} onClick={onCheckout} sx={{ mt: 1.2, minHeight: 60, borderRadius: 1.5, px: 2.75, textTransform: 'none', fontSize: 16, fontWeight: 900 }}>
            <Box component="span" sx={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}><Box component="span" sx={{ justifySelf: 'start' }}>{submitting ? 'Placing order…' : orderingAvailable ? 'Place order' : 'Ordering closed'}</Box><Box component="span">{formatCurrency(total)}</Box><Box component="span" sx={{ justifySelf: 'end', display: 'grid' }}><MenuIcon name="arrow" size={19} strokeWidth={2.2} /></Box></Box>
          </Button>
        </Stack>
      </Box>
    </Stack>
  </Drawer>
}

export default CartDrawer
