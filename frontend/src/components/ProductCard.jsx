import { Button, Card, CardActions, CardContent, Chip, Stack, Typography } from '@mui/material'

const formatCurrency = (amount) => new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(amount)

function ProductCard({ product, onAdd }) {
  const knownAvailability = product.availableQuantity !== null && product.availableQuantity !== undefined
  const quantity = knownAvailability ? product.availableQuantity : product.inventory?.quantity || 0
  const available = product.is_available && (!knownAvailability || quantity > 0)
  const ingredientRecipe = product.availabilitySource === 'ingredient_recipe'

  return <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}><CardContent sx={{ flex: 1 }}><Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}><Chip label={product.category} size="small" color="primary" variant="outlined" /><Typography fontWeight={800}>{formatCurrency(product.price)}</Typography></Stack><Typography variant="h6" fontWeight={800} sx={{ mt: 2 }}>{product.name}</Typography><Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>{product.description || 'Freshly prepared.'}</Typography><Typography variant="caption" color={available ? 'text.secondary' : 'error'} sx={{ display: 'block', mt: 2 }}>{available ? ingredientRecipe ? `${quantity} can still be made` : `${quantity} available` : 'Sold out'}</Typography></CardContent><CardActions sx={{ p: 2, pt: 0 }}><Button fullWidth variant="contained" onClick={() => onAdd(product)} disabled={!available}>Add to cart</Button></CardActions></Card>
}

export default ProductCard