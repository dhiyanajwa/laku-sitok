import { useEffect, useMemo, useState } from 'react'
import { Alert, AppBar, Badge, Box, Button, CircularProgress, Container, Dialog, DialogContent, DialogTitle, Grid, Stack, Toolbar, Typography } from '@mui/material'
import CartDrawer from '../components/CartDrawer'
import ProductCard from '../components/ProductCard'
import { createOrder, getProducts } from '../services/api'

function CustomerMenuPage() {
  const [products, setProducts] = useState([])
  const [cartItems, setCartItems] = useState([])
  const [customerName, setCustomerName] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState(null)

  const itemCount = useMemo(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems])

  async function loadProducts() {
    setLoading(true)
    setError('')

    try {
      const { data } = await getProducts()
      setProducts(data.data)
    } catch {
      setError('We could not load the menu. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  function addToCart(product) {
    const stock = product.inventory?.quantity || 0

    setCartItems((items) => {
      const existing = items.find((item) => item.id === product.id)
      if (existing) {
        if (existing.quantity >= stock) return items
        return items.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      }

      return [...items, { id: product.id, name: product.name, price: product.price, quantity: 1, stock }]
    })
  }

  function changeQuantity(productId, quantity) {
    setCartItems((items) => items
      .map((item) => item.id === productId ? { ...item, quantity: Math.min(quantity, item.stock) } : item)
      .filter((item) => item.quantity > 0))
  }

  async function submitOrder() {
    setSubmitting(true)
    setError('')

    try {
      const { data } = await createOrder({
        customerName,
        items: cartItems.map((item) => ({ productId: item.id, quantity: item.quantity })),
      })

      setConfirmation({ ...data.data, customerName })
      setCartItems([])
      setCustomerName('')
      setCartOpen(false)
      loadProducts()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We could not place your order. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const visibleProducts = products.filter((product) => product.is_available && (product.inventory?.quantity || 0) > 0)

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography variant="h6" color="primary" fontWeight={900}>Laku Sitok</Typography>
          <Button onClick={() => setCartOpen(true)} color="inherit">
            <Badge badgeContent={itemCount} color="primary" showZero>Cart</Badge>
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        <Stack spacing={1} sx={{ mb: 4 }}>
          <Typography component="h1" variant="h3" fontWeight={900}>Warung Murni</Typography>
          <Typography color="text.secondary">Order your favourites. We will prepare them fresh for you.</Typography>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

        {loading ? (
          <Stack alignItems="center" sx={{ py: 8 }} spacing={2}>
            <CircularProgress />
            <Typography color="text.secondary">Loading menu…</Typography>
          </Stack>
        ) : visibleProducts.length === 0 ? (
          <Alert severity="info">There are no available items right now.</Alert>
        ) : (
          <Grid container spacing={2}>
            {visibleProducts.map((product) => (
              <Grid key={product.id} size={{ xs: 12, sm: 6 }}>
                <ProductCard product={product} onAdd={addToCart} />
              </Grid>
            ))}
          </Grid>
        )}
      </Container>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cartItems={cartItems}
        customerName={customerName}
        onCustomerNameChange={setCustomerName}
        onQuantityChange={changeQuantity}
        onCheckout={submitOrder}
        submitting={submitting}
      />

      <Dialog open={Boolean(confirmation)} onClose={() => setConfirmation(null)}>
        <DialogTitle>Order received</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pb: 1 }}>
            <Typography>Thank you{confirmation?.customerName ? `, ${confirmation.customerName}` : ''}. Your order is now pending.</Typography>
            <Typography variant="h5" fontWeight={900} color="primary">{confirmation?.orderNumber}</Typography>
            <Typography color="text.secondary">Please keep this order number for reference.</Typography>
            <Button variant="contained" onClick={() => setConfirmation(null)}>Back to menu</Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  )
}

export default CustomerMenuPage
