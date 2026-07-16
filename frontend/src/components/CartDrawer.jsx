import { Box, Button, Divider, Drawer, IconButton, Stack, TextField, Typography } from '@mui/material'

const formatCurrency = (amount) => new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(amount)

function CartDrawer({ cartItems, customerName, onClose, onCustomerNameChange, onQuantityChange, onCheckout, open, submitting }) {
  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 420 } } }}>
      <Stack sx={{ height: '100%', p: 3 }} spacing={2.5}>
        <Box>
          <Typography variant="h5" fontWeight={800}>Your order</Typography>
          <Typography color="text.secondary">Review your items before checkout.</Typography>
        </Box>
        <Divider />
        <Stack spacing={2} sx={{ flex: 1, overflowY: 'auto' }}>
          {cartItems.length === 0 ? (
            <Typography color="text.secondary">Your cart is empty.</Typography>
          ) : cartItems.map((item) => (
            <Box key={item.id}>
              <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Box>
                  <Typography fontWeight={700}>{item.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{formatCurrency(item.price)} each</Typography>
                </Box>
                <Typography fontWeight={700}>{formatCurrency(item.price * item.quantity)}</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                <IconButton aria-label={`Remove one ${item.name}`} onClick={() => onQuantityChange(item.id, item.quantity - 1)} size="small">−</IconButton>
                <Typography sx={{ minWidth: 24, textAlign: 'center' }}>{item.quantity}</Typography>
                <IconButton aria-label={`Add one ${item.name}`} onClick={() => onQuantityChange(item.id, item.quantity + 1)} size="small" disabled={item.quantity >= item.stock}>+</IconButton>
                <Typography variant="caption" color="text.secondary">{item.stock} available</Typography>
              </Stack>
            </Box>
          ))}
        </Stack>
        <Divider />
        <Stack spacing={2}>
          <TextField label="Your name (optional)" value={customerName} onChange={(event) => onCustomerNameChange(event.target.value)} fullWidth />
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="h6">Total</Typography>
            <Typography variant="h6" fontWeight={800}>{formatCurrency(total)}</Typography>
          </Stack>
          <Button variant="contained" size="large" disabled={!cartItems.length || submitting} onClick={onCheckout}>
            {submitting ? 'Placing order…' : 'Place order'}
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  )
}

export default CartDrawer
