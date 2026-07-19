import { Box, Button, Card, Chip, Stack, Typography } from '@mui/material'
import { ProductIllustration } from './MenuVisuals'

const formatCurrency = (amount) => new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(amount)

function ProductCard({ product, onAdd, canOrder }) {
  const available = product.is_available && product.canOrder
  const canAdd = available && canOrder

  return <Card variant="outlined" sx={{ height: '100%', overflow: 'hidden', borderRadius: 2.5, borderColor: '#08a673', boxShadow: '0 2px 4px rgba(28, 52, 68, .025)', display: 'flex', flexDirection: 'column' }}>
    <Box sx={{ minHeight: { xs: 190, sm: 205 }, bgcolor: '#f8fafc', position: 'relative', display: 'grid', placeItems: 'center', p: 2 }}>
      <ProductIllustration product={product} />
    </Box>
    <Stack spacing={1.05} sx={{ p: { xs: 2, sm: 2.25 }, flex: 1 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="start" spacing={1.5}>
        <Box><Chip label={product.category} size="small" sx={{ height: 24, borderRadius: 1, bgcolor: '#eff4f8', color: '#45607d', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }} /><Typography variant="h6" sx={{ mt: 1, fontWeight: 900, color: '#10244a', lineHeight: 1.15 }}>{product.name}</Typography></Box>
        <Typography sx={{ mt: .5, whiteSpace: 'nowrap', color: '#007b5b', fontSize: 20, fontWeight: 900 }}>{formatCurrency(product.price)}</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ minHeight: 40 }}>{product.description || 'Freshly prepared.'}</Typography>
      <Box sx={{ pt: .4, mt: 'auto', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', columnGap: 1 }}>
        <Typography variant="caption" color={canAdd ? 'text.secondary' : 'error'}>{!canOrder ? 'Ordering closed' : available ? 'Available to order' : 'Sold out'}</Typography>
        <Button size="small" variant="contained" onClick={() => onAdd(product)} disabled={!canAdd} sx={{ justifySelf: 'end', width: 92, minWidth: 92, borderRadius: 1.75, textTransform: 'none', fontWeight: 800 }}>{canOrder ? 'Add' : 'Closed'}</Button>
      </Box>
    </Stack>
  </Card>
}

export default ProductCard
