import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, IconButton, MenuItem, Paper, Select, Stack, TextField, Typography } from '@mui/material'
import { adjustIngredient, createIngredient, getIngredientAvailability, getIngredients, getInventory, getProducts, getRecipe, updateIngredient, updateInventory, updateRecipe } from '../../services/api'
import MenuItemsPage from './MenuItemsPage'
import VendorIcon from '../../components/VendorIcon'

function numberInput(value) { return value === '' ? '' : Number(value) }

function InventoryToasts({ toasts, onDismiss }) {
  return <><style>{`@keyframes inventory-toast-in { 0% { transform: translateX(120%) scale(.96); opacity: 0; } 65% { transform: translateX(-8px) scale(1.01); opacity: 1; } 100% { transform: translateX(0) scale(1); opacity: 1; } }`}</style><Box sx={{ position: 'fixed', top: 96, right: { xs: 16, sm: 24 }, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 1.25, pointerEvents: 'none' }}>{toasts.map((toast) => <Paper key={toast.id} elevation={6} sx={{ pointerEvents: 'auto', p: 2, minWidth: { xs: 280, sm: 330 }, maxWidth: 390, borderRadius: 2.5, border: '1px solid', animation: 'inventory-toast-in .5s cubic-bezier(.16,1,.3,1) both', ...(toast.type === 'warning' ? { bgcolor: '#fff8e8', borderColor: '#f9cf71', color: '#a45b00' } : { bgcolor: '#ecfff6', borderColor: '#a7f3d0', color: 'var(--ls-primary)' }) }}><Stack direction="row" spacing={1.2} alignItems="center"><Box sx={{ width: 29, height: 29, display: 'grid', placeItems: 'center', borderRadius: '50%', bgcolor: toast.type === 'warning' ? '#fff0bd' : '#d5fae8', color: 'inherit', flexShrink: 0 }}><VendorIcon name={toast.type === 'warning' ? 'bell' : 'menu'} size={17} strokeWidth={2.7} /></Box><Typography sx={{ flex: 1, fontSize: 13.5, fontWeight: 900 }}>{toast.text}</Typography><IconButton aria-label="Dismiss notification" onClick={() => onDismiss(toast.id)} size="small" sx={{ color: 'inherit', opacity: .6 }}><Box component="span" sx={{ fontSize: 20, lineHeight: 1 }}>x</Box></IconButton></Stack></Paper>)}</Box></>
}

function ReadyItemCard({ item, value, onChange, onSave }) {
  const product = item.products
  const quantity = Number(value?.quantity ?? item.quantity ?? 0)
  const reorderLevel = Number(value?.reorderLevel ?? item.reorder_level ?? 0)
  const low = quantity <= reorderLevel
  const percentage = Math.min(100, Math.max(8, (quantity / Math.max(quantity, reorderLevel * 3, 1)) * 100))
  return <Paper elevation={0} sx={{ p: { xs: 2.25, sm: 3 }, border: '1px solid', borderColor: low ? '#f5d28a' : '#dfe8f1', borderRadius: 2.25, bgcolor: 'var(--ls-surface)' }}>
    <Stack spacing={2.5}>
      <Stack direction="row" justifyContent="space-between" spacing={1.5}><Box><Typography sx={{ color: 'var(--ls-text)', fontSize: 21, fontWeight: 900 }}>{product.name}</Typography><Box sx={{ display: 'inline-flex', alignItems: 'center', gap: .65, mt: 1, px: 1.1, py: .45, borderRadius: 3, bgcolor: low ? '#fff5d9' : '#eafff4', color: low ? '#a86400' : 'var(--ls-primary)', fontSize: 12, fontWeight: 900 }}><Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: 'currentColor' }} />{low ? 'Stock needs attention' : 'Stock level is healthy'}</Box></Box><Box sx={{ px: 1.1, py: .7, height: 'fit-content', borderRadius: 1, bgcolor: 'var(--ls-surface-muted)', color: '#607695', fontSize: 12, fontWeight: 900 }}>ID: {String(item.id).slice(-5)}</Box></Stack>
      <Box><Stack direction="row" justifyContent="space-between"><Typography variant="caption" sx={{ color: '#607695', fontWeight: 900 }}>STOCK LEVEL</Typography><Typography variant="caption" sx={{ color: low ? '#b36b00' : 'var(--ls-text-secondary)', fontWeight: 900 }}>{quantity} units left</Typography></Stack><Box sx={{ mt: .9, height: 10, borderRadius: 4, bgcolor: '#edf2f7', overflow: 'hidden' }}><Box sx={{ width: `${percentage}%`, height: '100%', borderRadius: 4, bgcolor: low ? '#f59e0b' : '#12b99e', transition: 'width .25s ease' }} /></Box></Box>
      <Box sx={{ pt: 2.25, borderTop: '1px solid #edf1f5' }}><Stack direction="row" spacing={1.5}><TextField label="Quantity" type="number" size="small" value={value?.quantity ?? ''} onChange={(event) => onChange({ ...value, quantity: numberInput(event.target.value) })} fullWidth inputProps={{ min: 0 }} /><TextField label="Reorder point" type="number" size="small" value={value?.reorderLevel ?? ''} onChange={(event) => onChange({ ...value, reorderLevel: numberInput(event.target.value) })} fullWidth inputProps={{ min: 0 }} /></Stack><Button fullWidth variant="outlined" onClick={onSave} startIcon={<VendorIcon name="menu" size={18} />} sx={{ mt: 2.25, minHeight: 43, borderColor: '#b7f2e6', bgcolor: '#f4fffc', color: 'var(--ls-primary)', fontWeight: 900, textTransform: 'none', '&:hover': { borderColor: 'var(--ls-primary)', bgcolor: '#e9fbf6' } }}>Commit stock level</Button></Box>
    </Stack>
  </Paper>
}

function IngredientRow({ ingredient, value, adjustment, editing, onAdjustmentChange, onRestock, onEdit, onValueChange, onSave }) {
  const low = ingredient.isLowStock
  return <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.4 }, border: '1px solid', borderColor: low ? '#fecaca' : 'var(--ls-border)', borderRadius: 2, bgcolor: low ? '#fffafa' : '#fff' }}>
    <Stack spacing={editing ? 2 : 1.25}>
      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} alignItems={{ lg: 'center' }}>
        <Box sx={{ flex: 1 }}><Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap"><Typography sx={{ color: 'var(--ls-text)', fontSize: 18, fontWeight: 900 }}>{ingredient.name}</Typography><Box sx={{ px: .9, py: .3, borderRadius: .75, bgcolor: low ? '#ffe5e8' : '#eef4fa', color: low ? '#b50b32' : 'var(--ls-text-secondary)', fontSize: 11, fontWeight: 900 }}>{low ? 'LOW STOCK' : 'HEALTHY'}</Box></Stack><Typography variant="body2" sx={{ mt: .55, color: 'var(--ls-text-muted)' }}>Current levels: <Box component="span" sx={{ color: '#203650', fontWeight: 900 }}>{ingredient.quantity} {ingredient.unit}</Box> (Safety point: {ingredient.reorder_level})</Typography></Box>
        <Stack direction="row" spacing={.9} alignItems="center" flexWrap="wrap"><TextField placeholder="Adjust by..." type="number" size="small" value={adjustment ?? ''} onChange={(event) => onAdjustmentChange(event.target.value)} sx={{ width: 120, '& .MuiOutlinedInput-root': { bgcolor: 'var(--ls-surface-muted)', borderRadius: 1.2 } }} /><Button size="small" variant="contained" onClick={onRestock} sx={{ minHeight: 38, bgcolor: 'var(--ls-primary)', fontWeight: 900, textTransform: 'none', '&:hover': { bgcolor: '#007d70' } }}>Restock</Button><Button size="small" variant="outlined" onClick={onEdit} sx={{ minHeight: 38, borderColor: 'var(--ls-border)', color: 'var(--ls-text-secondary)', fontWeight: 900, textTransform: 'none' }}>Set qty</Button><IconButton aria-label={`Save ${ingredient.name}`} onClick={onSave} sx={{ border: '1px solid #dce6ef', borderRadius: 1.2, color: '#7690ae' }}><VendorIcon name="menu" size={19} /></IconButton></Stack>
      </Stack>
      {editing && <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ pt: 1.75, borderTop: '1px solid #edf1f5' }}><TextField label="Exact quantity" type="number" size="small" value={value?.quantity ?? ''} onChange={(event) => onValueChange({ ...value, quantity: numberInput(event.target.value) })} inputProps={{ min: 0 }} fullWidth /><TextField label="Safety point" type="number" size="small" value={value?.reorderLevel ?? ''} onChange={(event) => onValueChange({ ...value, reorderLevel: numberInput(event.target.value) })} inputProps={{ min: 0 }} fullWidth /><Button variant="contained" onClick={onSave} sx={{ minWidth: 110, bgcolor: 'var(--ls-inverse-surface)', fontWeight: 900, textTransform: 'none' }}>Save</Button></Stack>}
    </Stack>
  </Paper>
}

function InventoryPage() {
  const [tab, setTab] = useState('items')
  const [inventory, setInventory] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [availability, setAvailability] = useState([])
  const [products, setProducts] = useState([])
  const [selectedRecipeProductId, setSelectedRecipeProductId] = useState('')
  const [values, setValues] = useState({})
  const [ingredientValues, setIngredientValues] = useState({})
  const [newIngredient, setNewIngredient] = useState({ name: '', quantity: '', unit: 'pieces', reorderLevel: '' })
  const [adjustments, setAdjustments] = useState({})
  const [recipeDraft, setRecipeDraft] = useState([])
  const [editingIngredientId, setEditingIngredientId] = useState('')
  const [toasts, setToasts] = useState([])
  const [error, setError] = useState('')

  const recipeProducts = useMemo(() => products.filter((product) => product.stock_mode === 'ingredient_recipe'), [products])
  const selectedRecipeProduct = recipeProducts.find((product) => product.id === selectedRecipeProductId)
  const selectedAvailability = availability.find((item) => item.productId === selectedRecipeProductId)

  function notify(text, type = 'success') {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts((current) => [...current, { id, text, type }])
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 4500)
  }

  async function load() {
    setError('')
    try {
      const [inventoryResponse, ingredientsResponse, availabilityResponse, productsResponse] = await Promise.all([getInventory(), getIngredients(), getIngredientAvailability(), getProducts()])
      const nextInventory = inventoryResponse.data.data
      const nextIngredients = ingredientsResponse.data.data
      const nextProducts = productsResponse.data.data
      setInventory(nextInventory)
      setIngredients(nextIngredients)
      setAvailability(availabilityResponse.data.data)
      setProducts(nextProducts)
      setValues(Object.fromEntries(nextInventory.map((item) => [item.products.id, { quantity: item.quantity, reorderLevel: item.reorder_level }])))
      setIngredientValues(Object.fromEntries(nextIngredients.map((item) => [item.id, { name: item.name, quantity: item.quantity, unit: item.unit, reorderLevel: item.reorder_level }])))
      const nextRecipeProducts = nextProducts.filter((product) => product.stock_mode === 'ingredient_recipe')
      setSelectedRecipeProductId((current) => nextRecipeProducts.some((product) => product.id === current) ? current : (nextRecipeProducts[0]?.id || ''))
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We could not load inventory.')
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!selectedRecipeProductId) { setRecipeDraft([]); return }
    getRecipe(selectedRecipeProductId).then(({ data }) => setRecipeDraft(data.data.items.map((item) => ({ ingredientId: item.ingredientId, quantityPerServing: item.quantityPerServing })))).catch((requestError) => setError(requestError.response?.data?.message || 'We could not load this recipe.'))
  }, [selectedRecipeProductId])

  async function saveItem(productId) {
    try { await updateInventory(productId, values[productId]); notify('Ready-item stock level updated.'); await load() } catch (requestError) { setError(requestError.response?.data?.message || 'We could not update item inventory.') }
  }

  async function saveIngredient(ingredientId) {
    const ingredient = ingredients.find((item) => item.id === ingredientId)
    try { await updateIngredient(ingredientId, ingredientValues[ingredientId]); setEditingIngredientId(''); notify(`${ingredient?.name || 'Ingredient'} stock saved.`); await load() } catch (requestError) { setError(requestError.response?.data?.message || 'We could not update the ingredient.') }
  }

  async function addIngredient() {
    try { const name = newIngredient.name.trim(); await createIngredient(newIngredient); setNewIngredient({ name: '', quantity: '', unit: 'pieces', reorderLevel: '' }); notify(`New ingredient ${name} added to master stock.`); await load() } catch (requestError) { setError(requestError.response?.data?.message || 'We could not add the ingredient.') }
  }

  async function adjust(ingredientId) {
    const value = Number(adjustments[ingredientId])
    const ingredient = ingredients.find((item) => item.id === ingredientId)
    if (!Number.isFinite(value) || value === 0) { setError('Enter a non-zero adjustment amount first.'); return }
    try { await adjustIngredient(ingredientId, { changeQuantity: value, reason: 'restock' }); setAdjustments((current) => ({ ...current, [ingredientId]: '' })); notify(`${ingredient?.name || 'Ingredient'} restocked by ${value} ${ingredient?.unit || ''}.`); await load() } catch (requestError) { setError(requestError.response?.data?.message || 'We could not adjust the ingredient.') }
  }

  async function saveRecipe() {
    if (!selectedRecipeProduct) return
    try { const response = await updateRecipe(selectedRecipeProduct.id, { items: recipeDraft }); setRecipeDraft(response.data.data.recipe.items.map((item) => ({ ingredientId: item.ingredientId, quantityPerServing: item.quantityPerServing }))); notify(`${selectedRecipeProduct.name} formula saved.`); await load() } catch (requestError) { setError(requestError.response?.data?.message || 'We could not save this recipe.') }
  }

  async function handleMenuCreated(product) {
    notify(`New menu item ${product.name} added to inventory.`)
    await load()
  }

  const updateRecipeRow = (index, updates) => setRecipeDraft((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...updates } : row))

  return <Stack spacing={3.25} sx={{ maxWidth: 1200, mx: 'auto', pb: 5 }}>
    <InventoryToasts toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
    <Box><Stack direction="row" spacing={1.1} alignItems="center"><Typography component="h1" sx={{ color: '#071d45', fontSize: { xs: 32, sm: 38 }, lineHeight: 1.1, fontWeight: 900 }}>Inventory Manager</Typography><Box sx={{ color: '#bd7b4a', display: 'grid' }}><VendorIcon name="inventory" size={31} /></Box></Stack><Typography sx={{ mt: .8, color: '#587193', fontSize: { xs: 14, sm: 16 } }}>Track ready items, raw kitchen ingredients, and every made-from-ingredients recipe in real time.</Typography></Box>
    {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
    <Paper elevation={0} sx={{ display: 'inline-flex', alignSelf: 'flex-start', p: .55, border: '1px solid #dce6ef', borderRadius: 2.1, bgcolor: 'var(--ls-surface)' }}><Stack direction="row" spacing={.45}><Button onClick={() => setTab('items')} startIcon={<VendorIcon name="orders" size={19} />} sx={{ minHeight: 45, px: { xs: 1.6, sm: 3.1 }, borderRadius: 1.55, bgcolor: tab === 'items' ? '#13b7a1' : 'transparent', color: tab === 'items' ? '#fff' : 'var(--ls-text-secondary)', fontWeight: 900, textTransform: 'none', boxShadow: tab === 'items' ? '0 5px 12px rgba(0,150,130,.2)' : 'none', '&:hover': { bgcolor: tab === 'items' ? '#099b89' : '#f4f8fb' } }}>Ready-To-Sell Items</Button><Button onClick={() => setTab('ingredients')} startIcon={<VendorIcon name="layers" size={19} />} sx={{ minHeight: 45, px: { xs: 1.6, sm: 3.1 }, borderRadius: 1.55, color: tab === 'ingredients' ? '#fff' : 'var(--ls-text-secondary)', bgcolor: tab === 'ingredients' ? '#13b7a1' : 'transparent', fontWeight: 900, textTransform: 'none', boxShadow: tab === 'ingredients' ? '0 5px 12px rgba(0,150,130,.2)' : 'none', '&:hover': { bgcolor: tab === 'ingredients' ? '#099b89' : '#f4f8fb' } }}>Ingredients & Recipes</Button></Stack></Paper>

    {tab === 'items' && <Stack spacing={3.5}><MenuItemsPage embedded onCreated={handleMenuCreated} /><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 3 }}>{inventory.map((item) => <ReadyItemCard key={item.id} item={item} value={values[item.products.id]} onChange={(next) => setValues((current) => ({ ...current, [item.products.id]: next }))} onSave={() => saveItem(item.products.id)} />)}</Box>{!inventory.length && <Paper elevation={0} sx={{ p: 3, border: '1px dashed #cbd9e5', borderRadius: 2, textAlign: 'center' }}><Typography sx={{ color: '#587193', fontWeight: 800 }}>Add a ready-to-sell menu item to begin your stock ledger.</Typography></Paper>}</Stack>}

    {tab === 'ingredients' && <Stack spacing={3.25}>
      <Paper elevation={0} sx={{ p: { xs: 2.25, sm: 3.5 }, border: '1px solid #e0e9f1', borderRadius: 2.5, bgcolor: 'var(--ls-surface)' }}><Stack spacing={2.5}><Box><Typography sx={{ color: 'var(--ls-text)', fontSize: 20, fontWeight: 900 }}>Recipe calculator</Typography><Typography variant="body2" sx={{ mt: .35, color: 'var(--ls-text-muted)' }}>Yield limits are calculated dynamically from raw master stocks.</Typography></Box>{recipeProducts.length ? <><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr' }, gap: 2, p: { xs: 1.5, sm: 2.4 }, border: '1px solid #e5ebf2', borderRadius: 2, bgcolor: 'var(--ls-surface-muted)' }}><Box><Typography variant="caption" sx={{ color: 'var(--ls-text-muted)', fontWeight: 900 }}>RECIPE MENU ITEM</Typography><Select value={selectedRecipeProductId} onChange={(event) => setSelectedRecipeProductId(event.target.value)} fullWidth size="small" sx={{ mt: 1, bgcolor: 'var(--ls-surface)', borderRadius: 1.4, fontWeight: 800, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--ls-border)' } }}>{recipeProducts.map((product) => <MenuItem key={product.id} value={product.id}>{product.name}</MenuItem>)}</Select></Box><Paper elevation={0} sx={{ p: 2, border: '1px solid #dce6ef', borderRadius: 1.6, bgcolor: 'var(--ls-surface)' }}><Typography variant="caption" sx={{ color: 'var(--ls-text-muted)', fontWeight: 900 }}>TOTAL COOK YIELD</Typography><Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}><Typography sx={{ mt: .65, color: '#081a3e', fontSize: 24, fontWeight: 900 }}>{selectedAvailability?.recipeComplete ? `Can make: ${selectedAvailability.estimatedAvailable} servings` : 'Recipe setup needed'}</Typography>{selectedAvailability?.recipeComplete && <Box sx={{ px: 1, py: .7, borderRadius: 1, bgcolor: Number(selectedAvailability.estimatedAvailable) === 0 ? '#ffe9ec' : '#eafff4', color: Number(selectedAvailability.estimatedAvailable) === 0 ? '#be123c' : 'var(--ls-primary)', fontSize: 12, fontWeight: 900 }}>{Number(selectedAvailability.estimatedAvailable) === 0 ? 'LIMITED STOCK' : 'AVAILABLE'}</Box>}</Stack></Paper></Box>{selectedAvailability?.recipeComplete && selectedAvailability.limitingIngredients?.length > 0 && <Alert severity={Number(selectedAvailability.estimatedAvailable) === 0 ? 'warning' : 'info'} sx={{ border: '1px solid', borderColor: Number(selectedAvailability.estimatedAvailable) === 0 ? '#f6d367' : '#b9d6ff', bgcolor: Number(selectedAvailability.estimatedAvailable) === 0 ? '#fff9e8' : '#f2f8ff' }}><Box component="span" fontWeight={900}>Bottleneck alert: </Box>limited by {selectedAvailability.limitingIngredients.map((item) => item.name).join(', ')}.</Alert>}</> : <Alert severity="info">Create a made-from-ingredients menu item to calculate recipe availability.</Alert>}</Stack></Paper>

      <Paper elevation={0} sx={{ p: { xs: 2.25, sm: 3.5 }, border: '1px solid #e0e9f1', borderRadius: 2.5, bgcolor: 'var(--ls-surface)' }}><Stack spacing={2.2}><Box><Typography sx={{ color: 'var(--ls-text)', fontSize: 20, fontWeight: 900 }}>Ingredients Master stock</Typography><Typography variant="body2" sx={{ mt: .35, color: 'var(--ls-text-muted)' }}>Atomic inventory levels deducted when the kitchen completes orders.</Typography></Box><Box sx={{ borderTop: '1px solid #e7edf3' }} />{ingredients.map((ingredient) => <IngredientRow key={ingredient.id} ingredient={ingredient} value={ingredientValues[ingredient.id]} adjustment={adjustments[ingredient.id]} editing={editingIngredientId === ingredient.id} onAdjustmentChange={(value) => setAdjustments((current) => ({ ...current, [ingredient.id]: value }))} onRestock={() => adjust(ingredient.id)} onEdit={() => setEditingIngredientId((current) => current === ingredient.id ? '' : ingredient.id)} onValueChange={(next) => setIngredientValues((current) => ({ ...current, [ingredient.id]: next }))} onSave={() => saveIngredient(ingredient.id)} />)}{!ingredients.length && <Typography sx={{ color: 'var(--ls-text-muted)' }}>No raw ingredients yet. Add the first one below.</Typography>}</Stack></Paper>

      <Paper elevation={0} sx={{ p: { xs: 2.25, sm: 3.5 }, border: '1px solid #e0e9f1', borderRadius: 2.5, bgcolor: 'var(--ls-surface)' }}><Stack spacing={2}><Box><Typography sx={{ color: 'var(--ls-text)', fontSize: 20, fontWeight: 900 }}>Add new raw ingredient</Typography><Typography variant="body2" sx={{ mt: .35, color: 'var(--ls-text-muted)' }}>Add a material to the ingredient master database.</Typography></Box><TextField label="Ingredient name" placeholder="e.g. Tomato slice" value={newIngredient.name} onChange={(event) => setNewIngredient((current) => ({ ...current, name: event.target.value }))} fullWidth /><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}><TextField label="Initial qty" type="number" value={newIngredient.quantity} onChange={(event) => setNewIngredient((current) => ({ ...current, quantity: event.target.value }))} inputProps={{ min: 0 }} fullWidth /><TextField label="Reorder point" type="number" value={newIngredient.reorderLevel} onChange={(event) => setNewIngredient((current) => ({ ...current, reorderLevel: event.target.value }))} inputProps={{ min: 0 }} fullWidth /></Stack><Button variant="contained" onClick={addIngredient} disabled={!newIngredient.name.trim()} startIcon={<Box component="span" sx={{ fontSize: 21, lineHeight: 1 }}>+</Box>} sx={{ minHeight: 46, bgcolor: 'var(--ls-primary)', fontWeight: 900, textTransform: 'none', '&:hover': { bgcolor: '#007d70' } }}>Add to Master DB</Button></Stack></Paper>

      {selectedRecipeProduct && <Paper elevation={0} sx={{ p: { xs: 2.25, sm: 3.5 }, border: '1px solid #e0e9f1', borderRadius: 2.5, bgcolor: 'var(--ls-surface)' }}><Stack spacing={2}><Box><Typography sx={{ color: 'var(--ls-text)', fontSize: 20, fontWeight: 900 }}>Formula recipe editor</Typography><Typography variant="body2" sx={{ mt: .35, color: 'var(--ls-text-muted)' }}>Set quantities consumed per single menu-item portion.</Typography></Box><Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2.4 }, borderColor: '#dfe8f0', bgcolor: 'var(--ls-surface-muted)' }}><Stack spacing={1.35}><Typography sx={{ color: 'var(--ls-primary)', fontWeight: 900 }}>Formula: {selectedRecipeProduct.name}</Typography>{recipeDraft.map((row, index) => <Paper key={`${row.ingredientId}-${index}`} elevation={0} sx={{ p: 1.25, border: '1px solid #dce6ef', borderRadius: 1.3, bgcolor: 'var(--ls-surface)' }}><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} alignItems={{ sm: 'center' }}><TextField select size="small" value={row.ingredientId} onChange={(event) => updateRecipeRow(index, { ingredientId: event.target.value })} sx={{ flex: 1, '& .MuiOutlinedInput-root': { bgcolor: 'var(--ls-surface)' } }}><MenuItem value="">Choose an ingredient</MenuItem>{ingredients.map((ingredient) => <MenuItem key={ingredient.id} value={ingredient.id}>{ingredient.name} ({ingredient.unit})</MenuItem>)}</TextField><TextField label="Per serving" type="number" size="small" value={row.quantityPerServing} onChange={(event) => updateRecipeRow(index, { quantityPerServing: event.target.value })} inputProps={{ min: .01, step: .01 }} sx={{ width: { sm: 150 } }} /><Button color="error" onClick={() => setRecipeDraft((current) => current.filter((_row, rowIndex) => rowIndex !== index))} sx={{ textTransform: 'none', fontWeight: 800 }}>Remove</Button></Stack></Paper>)}<Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}><Button variant="outlined" onClick={() => setRecipeDraft((current) => [...current, { ingredientId: ingredients[0]?.id || '', quantityPerServing: 1 }])} disabled={!ingredients.length} sx={{ flex: 1, borderColor: '#cdd9e5', color: 'var(--ls-text-secondary)', fontWeight: 900, textTransform: 'none' }}>Add material</Button><Button variant="contained" onClick={saveRecipe} disabled={!recipeDraft.length} sx={{ flex: 1, bgcolor: 'var(--ls-primary)', fontWeight: 900, textTransform: 'none', '&:hover': { bgcolor: '#007d70' } }}>Save formula</Button></Stack></Stack></Paper></Stack></Paper>}
    </Stack>}
  </Stack>
}

export default InventoryPage