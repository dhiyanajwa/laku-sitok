import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, MenuItem, Paper, Stack, Tab, Tabs, TextField, Typography } from '@mui/material'
import { adjustIngredient, createIngredient, getIngredientAvailability, getIngredients, getInventory, getProducts, getRecipe, updateIngredient, updateInventory, updateRecipe } from '../../services/api'
import MenuItemsPage from './MenuItemsPage'

function numberInput(value) { return value === '' ? '' : Number(value) }

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
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const recipeProducts = useMemo(() => products.filter((product) => product.stock_mode === 'ingredient_recipe'), [products])
  const selectedRecipeProduct = recipeProducts.find((product) => product.id === selectedRecipeProductId)
  const selectedAvailability = availability.find((item) => item.productId === selectedRecipeProductId)

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
    getRecipe(selectedRecipeProductId)
      .then(({ data }) => setRecipeDraft(data.data.items.map((item) => ({ ingredientId: item.ingredientId, quantityPerServing: item.quantityPerServing }))))
      .catch((requestError) => setError(requestError.response?.data?.message || 'We could not load this recipe.'))
  }, [selectedRecipeProductId])

  async function saveItem(productId) {
    try { await updateInventory(productId, values[productId]); setNotice('Item inventory saved.'); load() } catch (requestError) { setError(requestError.response?.data?.message || 'We could not update item inventory.') }
  }

  async function saveIngredient(ingredientId) {
    try { await updateIngredient(ingredientId, ingredientValues[ingredientId]); setNotice('Ingredient saved.'); load() } catch (requestError) { setError(requestError.response?.data?.message || 'We could not update the ingredient.') }
  }

  async function addIngredient() {
    try { await createIngredient(newIngredient); setNewIngredient({ name: '', quantity: '', unit: 'pieces', reorderLevel: '' }); setNotice('Ingredient added.'); load() } catch (requestError) { setError(requestError.response?.data?.message || 'We could not add the ingredient.') }
  }

  async function adjust(ingredientId, reason) {
    const value = Number(adjustments[ingredientId])
    if (!Number.isFinite(value) || value === 0) { setError('Enter a non-zero adjustment amount first.'); return }
    try { await adjustIngredient(ingredientId, { changeQuantity: value, reason }); setAdjustments((current) => ({ ...current, [ingredientId]: '' })); setNotice(reason === 'restock' ? 'Ingredient restocked.' : 'Ingredient adjusted.'); load() } catch (requestError) { setError(requestError.response?.data?.message || 'We could not adjust the ingredient.') }
  }

  async function saveRecipe() {
    if (!selectedRecipeProduct) return
    try {
      const response = await updateRecipe(selectedRecipeProduct.id, { items: recipeDraft })
      setRecipeDraft(response.data.data.recipe.items.map((item) => ({ ingredientId: item.ingredientId, quantityPerServing: item.quantityPerServing })))
      setNotice(`${selectedRecipeProduct.name} recipe saved.`)
      load()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We could not save this recipe.')
    }
  }

  return <Stack spacing={3}>
    <Stack spacing={0.5}><Typography variant="h4" fontWeight={900}>Inventory</Typography><Typography color="text.secondary">Track ready items, ingredients, and every made-from-ingredients recipe.</Typography></Stack>
    {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
    {notice && <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert>}
    <Paper><Tabs value={tab} onChange={(_event, value) => setTab(value)}><Tab value="items" label="Items" /><Tab value="ingredients" label="Ingredients & recipes" /></Tabs></Paper>

{tab === 'items' && <Stack spacing={3}>
      <MenuItemsPage embedded onCreated={load} />
      <Stack spacing={2}>
        <Typography fontWeight={900}>Ready-item stock</Typography>
        {inventory.map((item) => <Paper key={item.id} sx={{ p: 2.5 }}><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}><Stack sx={{ flex: 1 }}><Typography fontWeight={800}>{item.products.name}</Typography><Typography color={item.isLowStock ? 'error' : 'text.secondary'} variant="body2">{item.isLowStock ? 'Low stock' : 'Stock level is healthy'}</Typography></Stack><TextField label="Quantity" type="number" size="small" value={values[item.products.id]?.quantity ?? ''} onChange={(event) => setValues({ ...values, [item.products.id]: { ...values[item.products.id], quantity: numberInput(event.target.value) } })} /><TextField label="Reorder at" type="number" size="small" value={values[item.products.id]?.reorderLevel ?? ''} onChange={(event) => setValues({ ...values, [item.products.id]: { ...values[item.products.id], reorderLevel: numberInput(event.target.value) } })} /><Button variant="outlined" onClick={() => saveItem(item.products.id)}>Save</Button></Stack></Paper>)}
        {!inventory.length && <Alert severity="info">Add a ready-item menu item to manage its finished stock here.</Alert>}
      </Stack>
    </Stack>}

    {tab === 'ingredients' && <Stack spacing={3}>
      {recipeProducts.length > 0 && <Paper sx={{ p: 2.5 }}><Stack spacing={2}><TextField select label="Recipe menu item" value={selectedRecipeProductId} onChange={(event) => setSelectedRecipeProductId(event.target.value)} fullWidth>{recipeProducts.map((product) => <MenuItem key={product.id} value={product.id}>{product.name}</MenuItem>)}</TextField>{selectedRecipeProduct && <Box><Typography variant="h6" fontWeight={900}>Can still make</Typography>{selectedAvailability?.recipeComplete ? <><Typography variant="h4" color="primary" fontWeight={900}>{selectedRecipeProduct.name}: {selectedAvailability.estimatedAvailable}</Typography><Typography color="text.secondary">Limited by {selectedAvailability.limitingIngredients.map((item) => `${item.name} (${item.supportedServings} servings)`).join(', ')}.</Typography></> : <Alert severity="warning">{selectedRecipeProduct.name} needs a complete recipe before Laku Sitok can estimate availability.</Alert>}</Box>}</Stack></Paper>}
      {!recipeProducts.length && <Alert severity="info">Create a made-from-ingredients menu item to manage its recipe here.</Alert>}

      <Paper sx={{ p: 2.5 }}><Stack spacing={2}><Typography fontWeight={900}>Add ingredient</Typography><Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}><TextField label="Name" value={newIngredient.name} onChange={(event) => setNewIngredient({ ...newIngredient, name: event.target.value })} /><TextField label="Quantity" type="number" value={newIngredient.quantity} onChange={(event) => setNewIngredient({ ...newIngredient, quantity: event.target.value })} /><TextField label="Unit" value={newIngredient.unit} onChange={(event) => setNewIngredient({ ...newIngredient, unit: event.target.value })} /><TextField label="Reorder at" type="number" value={newIngredient.reorderLevel} onChange={(event) => setNewIngredient({ ...newIngredient, reorderLevel: event.target.value })} /><Button variant="contained" onClick={addIngredient}>Add</Button></Stack></Stack></Paper>

      {ingredients.map((ingredient) => <Paper key={ingredient.id} sx={{ p: 2.5 }}><Stack spacing={1.5}><Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}><Typography sx={{ minWidth: 160 }} fontWeight={800}>{ingredient.name}</Typography><TextField label="Quantity" type="number" size="small" value={ingredientValues[ingredient.id]?.quantity ?? ''} onChange={(event) => setIngredientValues({ ...ingredientValues, [ingredient.id]: { ...ingredientValues[ingredient.id], quantity: numberInput(event.target.value) } })} /><TextField label="Unit" size="small" value={ingredientValues[ingredient.id]?.unit ?? ''} onChange={(event) => setIngredientValues({ ...ingredientValues, [ingredient.id]: { ...ingredientValues[ingredient.id], unit: event.target.value } })} /><TextField label="Reorder at" type="number" size="small" value={ingredientValues[ingredient.id]?.reorderLevel ?? ''} onChange={(event) => setIngredientValues({ ...ingredientValues, [ingredient.id]: { ...ingredientValues[ingredient.id], reorderLevel: numberInput(event.target.value) } })} /><Button variant="outlined" onClick={() => saveIngredient(ingredient.id)}>Save</Button></Stack><Stack direction="row" spacing={1} alignItems="center"><TextField label="Restock / adjust by" type="number" size="small" value={adjustments[ingredient.id] ?? ''} onChange={(event) => setAdjustments({ ...adjustments, [ingredient.id]: event.target.value })} /><Button size="small" onClick={() => adjust(ingredient.id, 'restock')}>Restock</Button><Button size="small" onClick={() => adjust(ingredient.id, 'manual_adjustment')}>Adjust</Button><Typography variant="caption" color={ingredient.isLowStock ? 'error.main' : 'text.secondary'}>{ingredient.isLowStock ? 'Low stock' : 'Healthy'}</Typography></Stack></Stack></Paper>)}

      {selectedRecipeProduct && <Paper sx={{ p: 2.5 }}><Stack spacing={2}><Box><Typography fontWeight={900}>{selectedRecipeProduct.name} recipe</Typography><Typography variant="body2" color="text.secondary">Set the amount of each ingredient used for one serving.</Typography></Box>{recipeDraft.map((item, index) => <Stack key={`${item.ingredientId}-${index}`} direction={{ xs: 'column', sm: 'row' }} spacing={1.5}><TextField select fullWidth label="Ingredient" value={item.ingredientId} onChange={(event) => setRecipeDraft(recipeDraft.map((row, rowIndex) => rowIndex === index ? { ...row, ingredientId: event.target.value } : row))}>{ingredients.map((ingredient) => <MenuItem key={ingredient.id} value={ingredient.id}>{ingredient.name} ({ingredient.unit})</MenuItem>)}</TextField><TextField label="Per serving" type="number" value={item.quantityPerServing} onChange={(event) => setRecipeDraft(recipeDraft.map((row, rowIndex) => rowIndex === index ? { ...row, quantityPerServing: event.target.value } : row))} inputProps={{ min: 0.01, step: 0.01 }} /><Button color="error" onClick={() => setRecipeDraft(recipeDraft.filter((_row, rowIndex) => rowIndex !== index))}>Remove</Button></Stack>)}<Stack direction="row" spacing={1}><Button variant="outlined" onClick={() => setRecipeDraft([...recipeDraft, { ingredientId: ingredients[0]?.id || '', quantityPerServing: 1 }])} disabled={!ingredients.length}>Add ingredient</Button><Button variant="contained" onClick={saveRecipe} disabled={!recipeDraft.length}>Save recipe</Button></Stack></Stack></Paper>}
    </Stack>}
  </Stack>
}

export default InventoryPage