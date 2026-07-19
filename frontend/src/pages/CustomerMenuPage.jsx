import { useEffect, useMemo, useState } from 'react'
import { Alert, AppBar, Badge, Box, Button, Chip, CircularProgress, Container, Dialog, Divider, DialogContent, DialogTitle, Grid, InputBase, MenuItem, Paper, Select, Stack, Toolbar, Typography } from '@mui/material'
import { QRCodeSVG } from 'qrcode.react'
import { useNavigate } from 'react-router-dom'
import CartDrawer from '../components/CartDrawer'
import { MenuIcon } from '../components/MenuVisuals'
import ProductCard from '../components/ProductCard'
import { createOrder, getProducts, getStallAvailability } from '../services/api'


function CustomerMenuPage() {
  const [products, setProducts] = useState([])
  const [stallAvailability, setStallAvailability] = useState(null)
  const [cartItems, setCartItems] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState(null)
  const [copied, setCopied] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [sortBy, setSortBy] = useState('popularity')
  const navigate = useNavigate()
  const itemCount = useMemo(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems])
  const orderingAvailable = Boolean(stallAvailability?.isOpen)

  async function loadProducts() {
    setLoading(true); setError('')
    try { const { data } = await getProducts(); setProducts(data.data) } catch { setError('We could not load the menu. Please try again.') } finally { setLoading(false) }
  }
  async function loadStallAvailability() {
    try { const { data } = await getStallAvailability(); setStallAvailability(data.data) } catch { setError('We could not check whether the stall is open. Please try again.') }
  }
  useEffect(() => { loadProducts(); loadStallAvailability() }, [])

  function addToCart(product) {
    if (!orderingAvailable) { setError(stallAvailability?.customerMessage || 'Ordering is currently unavailable.'); return }
    const stock = product.availableQuantity ?? product.inventory?.quantity ?? 99
    setCartItems((items) => {
      const existing = items.find((item) => item.id === product.id)
      if (existing) return existing.quantity >= stock ? items : items.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      return [...items, { id: product.id, name: product.name, category: product.category, price: product.price, quantity: 1, stock }]
    })
  }
  function changeQuantity(productId, quantity) { setCartItems((items) => items.map((item) => item.id === productId ? { ...item, quantity: Math.min(quantity, item.stock) } : item).filter((item) => item.quantity > 0)) }

  async function submitOrder() {
    setSubmitting(true); setError('')
    try {
      const availabilityResponse = await getStallAvailability()
      const currentAvailability = availabilityResponse.data.data
      setStallAvailability(currentAvailability)
      if (!currentAvailability.isOpen) { setError(currentAvailability.customerMessage || 'Ordering is currently unavailable.'); return }
      const { data } = await createOrder({ items: cartItems.map((item) => ({ productId: item.id, quantity: item.quantity })) })
      setConfirmation(data.data); setCartItems([]); setCartOpen(false); loadProducts()
    } catch (requestError) { setError(requestError.response?.data?.message || 'We could not place your order. Please try again.') } finally { setSubmitting(false) }
  }

  const categories = useMemo(() => ['All', ...new Set(products.map((product) => product.category).filter(Boolean))], [products])
  const visibleProducts = useMemo(() => products
    .filter((product) => product.is_available && (product.availableQuantity === null || product.availableQuantity === undefined || product.availableQuantity > 0))
    .filter((product) => category === 'All' || product.category === category)
    .filter((product) => `${product.name} ${product.description || ''} ${product.category}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'price-low') return Number(a.price) - Number(b.price)
      if (sortBy === 'price-high') return Number(b.price) - Number(a.price)
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      return Number(b.popularity || 0) - Number(a.popularity || 0) || a.name.localeCompare(b.name)
    }), [products, category, search, sortBy])

  const trackingUrl = confirmation?.trackingToken ? `${window.location.origin}/track/${confirmation.trackingToken}` : ''
  async function copyTrackingLink() { try { await navigator.clipboard.writeText(trackingUrl); setCopied(true) } catch { setError('We could not copy the tracking link.') } }
  function clearFilters() { setSearch(''); setCategory('All'); setSortBy('popularity') }

  return <Box sx={{ minHeight: '100vh', bgcolor: '#f7fafc', color: '#10244a' }}>
    <AppBar position="sticky" color="inherit" elevation={0} sx={{ bgcolor: 'rgba(255,255,255,.96)', borderBottom: '1px solid #ebeff3', backdropFilter: 'blur(8px)' }}>
      <Toolbar component={Container} maxWidth="xl" disableGutters sx={{ minHeight: { xs: 82, md: 80 }, px: { xs: 2, sm: 3 }, gap: { xs: 1.25, md: 2.5 }, flexWrap: 'wrap', py: { xs: 1.2, md: 0 } }}>
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ flexShrink: 0 }}>
          <Box sx={{ width: 50, height: 50, display: 'grid', placeItems: 'center', borderRadius: 1.5, bgcolor: '#078361', color: '#fff', fontSize: 23, fontWeight: 900, boxShadow: '0 4px 8px rgba(0, 100, 70, .22)' }}>LS</Box>
          <Typography sx={{ color: '#006e52', fontSize: { xs: 19, sm: 22 }, fontWeight: 900, whiteSpace: 'nowrap' }}>Laku Sitok</Typography>
        </Stack>
        <Box sx={{ order: { xs: 3, md: 2 }, flex: { xs: '1 0 100%', md: 1 }, minWidth: 0, maxWidth: 500, mx: { md: 'auto' }, display: 'flex', alignItems: 'center', gap: 1.2, px: 2, height: 48, bgcolor: '#f8fafc', border: '1px solid #dce5ee', borderRadius: 6, color: '#8aa0b9' }}><MenuIcon name="search" size={21} /><InputBase value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search for kopi, burger, nasi lemak..." inputProps={{ 'aria-label': 'Search menu' }} sx={{ flex: 1, fontSize: { xs: 14, sm: 16 }, color: '#344d6b', '& input::placeholder': { color: '#92a0b2', opacity: 1 } }} /></Box>
        <Button onClick={() => setCartOpen(true)} aria-label={`Open basket with ${itemCount} items`} sx={{ order: { xs: 2, md: 3 }, minWidth: 50, width: 50, height: 50, p: 0, color: '#006e52', border: '1px solid #dde6ef', borderRadius: '50%' }}><Badge badgeContent={itemCount} color="primary" invisible={!itemCount} sx={{ '& .MuiBadge-badge': { bgcolor: '#8bdcc3', color: '#fff', fontWeight: 900 } }}><MenuIcon name="bag" size={24} strokeWidth={2} /></Badge></Button>
      </Toolbar>
    </AppBar>

    <Container maxWidth="xl" sx={{ py: { xs: 2.25, sm: 4, md: 5.25 }, px: { xs: 2, sm: 3 } }}>
      <Paper elevation={0} sx={{ p: { xs: 2.25, sm: 3.75 }, border: '1px solid #e5edf0', borderRadius: 2.5, background: 'linear-gradient(108deg, #fff 40%, #f5fffb)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={2.5}>
          <Stack direction="row" spacing={{ xs: 1.5, sm: 2.25 }} alignItems="center"><Box sx={{ width: { xs: 58, sm: 70 }, height: { xs: 58, sm: 70 }, display: 'grid', placeItems: 'center', borderRadius: 1.7, bgcolor: '#ebfff6', border: '1px solid #c7f4df', color: '#008764' }}><MenuIcon name="fork" size={38} strokeWidth={1.6} /></Box><Box><Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} spacing={1}><Typography component="h1" sx={{ color: '#081a3e', fontSize: { xs: 26, sm: 31 }, lineHeight: 1.05, fontWeight: 900 }}>Warung Murni</Typography><Chip label={orderingAvailable ? 'OPEN NOW' : 'ORDERING CLOSED'} size="small" sx={{ alignSelf: { xs: 'start', sm: 'center' }, bgcolor: orderingAvailable ? '#e6fff3' : '#fff4df', color: orderingAvailable ? '#008764' : '#a55f00', fontWeight: 900, fontSize: 11 }} /></Stack><Typography sx={{ mt: .8, color: '#526b89', fontSize: { xs: 14, sm: 16 } }}>Freshly prepared Sarawakian comfort food & traditional local brew.</Typography></Box></Stack>
          <Stack direction="row" alignItems="stretch" divider={<Divider orientation="vertical" flexItem sx={{ borderColor: '#dfe7ef' }} />} sx={{ width: { xs: '100%', md: 'auto' }, border: '1px solid #e8eef3', borderRadius: 2, bgcolor: '#fbfdff', px: { xs: 1, sm: 1.8 }, py: 1.3, justifyContent: { xs: 'space-around', md: 'initial' }, '& > *': { px: { xs: .75, sm: 1.5 } } }}>
            <Stack direction="row" spacing={.8} alignItems="center"><Box sx={{ color: '#ffae1b', display: 'grid' }}><MenuIcon name="star" size={19} /></Box><Typography variant="body2" fontWeight={800}>4.8</Typography><Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>(120+)</Typography></Stack>
            <Stack direction="row" spacing={.8} alignItems="center"><Box sx={{ color: '#00956c', display: 'grid' }}><MenuIcon name="clock" size={19} /></Box><Typography variant="body2" whiteSpace="nowrap">15 - 25 min</Typography></Stack>
            <Stack direction="row" spacing={.8} alignItems="center"><Box sx={{ color: '#00956c', display: 'grid' }}><MenuIcon name="pin" size={19} /></Box><Typography variant="body2" whiteSpace="nowrap">1.2 km</Typography></Stack>
          </Stack>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ mt: { xs: 2.25, sm: 4.5 }, p: { xs: 2, sm: 2.5 }, border: '1px solid #e5edf3', borderRadius: 2.5 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'end' }} spacing={2}>
          <Box><Stack direction="row" alignItems="center" spacing={.9} sx={{ color: '#8497b4' }}><MenuIcon name="filter" size={18} /><Typography variant="caption" sx={{ fontWeight: 900, letterSpacing: .2 }}>CATEGORIES</Typography></Stack><Stack direction="row" flexWrap="wrap" gap={1.1} sx={{ mt: 1.2 }}>{categories.map((item) => <Chip key={item} label={item} onClick={() => setCategory(item)} sx={{ height: 42, px: .7, borderRadius: 3, border: '1px solid', borderColor: category === item ? '#006e52' : '#dbe5ef', bgcolor: category === item ? '#006e52' : '#f8fafc', color: category === item ? '#fff' : '#385270', fontWeight: 800, '&:hover': { bgcolor: category === item ? '#005b44' : '#eef4f8' } }} />)}</Stack></Box>
          <Box sx={{ width: { xs: '100%', sm: 207 } }}><Typography variant="caption" sx={{ display: 'block', mb: .7, textAlign: { sm: 'right' }, color: '#8497b4', fontWeight: 900 }}>SORT BY</Typography><Select fullWidth size="small" value={sortBy} onChange={(event) => setSortBy(event.target.value)} sx={{ height: 42, bgcolor: '#f8fafc', borderRadius: 1.5, color: '#385270', fontWeight: 700, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#dbe5ef' } }}><MenuItem value="popularity">🔥 Popularity</MenuItem><MenuItem value="price-low">Price: low to high</MenuItem><MenuItem value="price-high">Price: high to low</MenuItem><MenuItem value="name">Name: A to Z</MenuItem></Select></Box>
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mt: 2.5 }} onClose={() => setError('')}>{error}</Alert>}{stallAvailability && !orderingAvailable && <Alert severity="info" sx={{ mt: 2.5 }}>{stallAvailability.customerMessage || 'Ordering is currently unavailable.'}</Alert>}
      {loading ? <Stack alignItems="center" sx={{ py: 10 }} spacing={2}><CircularProgress /><Typography color="text.secondary">Loading menu…</Typography></Stack> : visibleProducts.length === 0 ? <Paper elevation={0} sx={{ mt: 4, py: 8, textAlign: 'center', border: '1px solid #e5edf3', borderRadius: 2.5 }}><Typography sx={{ color: '#10244a', fontWeight: 900 }}>No menu items found</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: .7 }}>Try another search term or category.</Typography><Button onClick={clearFilters} sx={{ mt: 1.5, textTransform: 'none', fontWeight: 800 }}>Clear filters</Button></Paper> : <Grid container spacing={{ xs: 2, sm: 3.25 }} sx={{ mt: { xs: 1.1, sm: 2 } }}>{visibleProducts.map((product) => <Grid key={product.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}><ProductCard product={product} onAdd={addToCart} canOrder={orderingAvailable} /></Grid>)}</Grid>}
    </Container>

    <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} cartItems={cartItems} error={error} orderingAvailable={orderingAvailable} availabilityMessage={stallAvailability?.customerMessage} onQuantityChange={changeQuantity} onCheckout={submitOrder} submitting={submitting} />
    <Dialog open={Boolean(confirmation)} onClose={() => setConfirmation(null)} maxWidth="xs" fullWidth><DialogTitle sx={{ fontWeight: 900 }}>Order received</DialogTitle><DialogContent><Stack spacing={2.25} alignItems="center" sx={{ pb: 1, textAlign: 'center' }}><Typography color="success.main" sx={{ fontSize: 56, lineHeight: 1 }}>✓</Typography><Typography>Thank you. We have received your order.</Typography><Typography variant="h5" fontWeight={900} color="primary">{confirmation?.orderNumber}</Typography><Typography color="text.secondary">Usually ready in 10–15 minutes.</Typography>{trackingUrl && <QRCodeSVG value={trackingUrl} size={144} includeMargin />}<Button variant="contained" fullWidth onClick={() => navigate(`/track/${confirmation.trackingToken}`)}>Track my order</Button><Button variant="outlined" fullWidth onClick={copyTrackingLink}>{copied ? 'Tracking link copied' : 'Copy tracking link'}</Button><Button onClick={() => setConfirmation(null)}>Back to menu</Button></Stack></DialogContent></Dialog>
  </Box>
}

export default CustomerMenuPage
