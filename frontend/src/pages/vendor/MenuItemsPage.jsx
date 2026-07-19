import { useEffect, useState } from 'react'
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { createProduct, getIngredients, getVendorProducts, suggestRecipeDraft } from '../../services/api'

const emptyIngredient = () => ({ name: '', quantity: '', unit: 'pieces', reorderLevel: '' })
const emptyForm = () => ({
  name: '',
  category: 'Meals',
  description: '',
  price: '',
  costPrice: '',
  stockMode: 'ready_item',
  quantity: '',
  reorderLevel: '5',
  recipe: [],
})

const formFieldSx = {
  '& .MuiOutlinedInput-root': { bgcolor: '#f7f9fc', borderRadius: 1.5 },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--ls-border)' },
  '& .MuiInputLabel-root': { color: '#8295b3', fontSize: 12, fontWeight: 800, textTransform: 'uppercase' },
}

function availabilityText(product) {
  if (product.stock_mode === 'ingredient_recipe') {
    if (!product.recipeComplete) return 'Recipe setup incomplete'
    return `${product.availableQuantity ?? 0} can still be made`
  }
  return `${product.inventory?.quantity ?? 0} ready items available`
}

function MenuItemsPage({ embedded = false, onCreated }) {
  const [products, setProducts] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [open, setOpen] = useState(false)
  const [quickName, setQuickName] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [clarification, setClarification] = useState(null)
  const [clarificationAnswer, setClarificationAnswer] = useState('')

  async function load() {
    setError('')
    try {
      const [productsResponse, ingredientsResponse] = await Promise.all([getVendorProducts(), getIngredients()])
      setProducts(productsResponse.data.data)
      setIngredients(ingredientsResponse.data.data)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We could not load menu items.')
    }
  }

  useEffect(() => { load() }, [])

  function closeForm() {
    if (saving) return
    setOpen(false)
    setForm(emptyForm())
    setClarification(null)
    setClarificationAnswer('')
  }

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function addRecipeRow(type) {
    setForm((current) => ({
      ...current,
      recipe: [...current.recipe, type === 'new'
        ? { type: 'new', quantityPerServing: '', newIngredient: emptyIngredient() }
        : { type: 'existing', ingredientId: '', quantityPerServing: '' }],
    }))
  }

  function updateRecipeRow(index, updates) {
    setForm((current) => ({
      ...current,
      recipe: current.recipe.map((row, rowIndex) => rowIndex === index ? { ...row, ...updates } : row),
    }))
  }

  function updateInlineIngredient(index, field, value) {
    setForm((current) => ({
      ...current,
      recipe: current.recipe.map((row, rowIndex) => rowIndex === index
        ? { ...row, newIngredient: { ...row.newIngredient, [field]: value } }
        : row),
    }))
  }

  function removeRecipeRow(index) {
    setForm((current) => ({ ...current, recipe: current.recipe.filter((_row, rowIndex) => rowIndex !== index) }))
  }

  async function requestAiRecipe(answer) {
    setAiLoading(true)
    setError('')
    try {
      const { data } = await suggestRecipeDraft({
        name: form.name,
        category: form.category,
        description: form.description,
        ...(answer ? { clarification: answer } : {}),
      })
      const result = data.data
      if (result.outcome === 'question') {
        setClarification(result.question)
        setClarificationAnswer('')
        return
      }

      const recipe = result.suggestions.map((suggestion) => suggestion.matchedIngredientId
        ? {
          type: 'existing',
          ingredientId: suggestion.matchedIngredientId,
          quantityPerServing: suggestion.quantityPerServing,
          aiSuggested: true,
          aiConfidence: suggestion.matchConfidence,
        }
        : {
          type: 'new',
          quantityPerServing: suggestion.quantityPerServing,
          aiSuggested: true,
          aiConfidence: suggestion.matchConfidence,
          newIngredient: {
            name: suggestion.name,
            quantity: '0',
            unit: suggestion.unit || 'pieces',
            reorderLevel: '0',
          },
        })
      setForm((current) => ({ ...current, stockMode: 'ingredient_recipe', recipe }))
      setClarification(null)
      setClarificationAnswer('')
      setNotice('AI draft added. Review every ingredient and quantity before saving.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not prepare a recipe suggestion. Please try again or add it manually.')
    } finally {
      setAiLoading(false)
    }
  }

  async function saveMenuItem() {
    setSaving(true)
    setError('')
    try {
      const recipe = form.stockMode === 'ingredient_recipe'
        ? form.recipe.map((row) => row.type === 'new'
          ? { newIngredient: row.newIngredient, quantityPerServing: row.quantityPerServing }
          : { ingredientId: row.ingredientId, quantityPerServing: row.quantityPerServing })
        : undefined
      const { data } = await createProduct({ ...form, ...(recipe ? { recipe } : {}) })
      const product = data.data
      setOpen(false)
      setForm(emptyForm())
      setClarification(null)
      setClarificationAnswer('')
      setNotice(product.stock_mode === 'ingredient_recipe'
        ? `${product.name} was added. Can still make: ${product.availableQuantity ?? 0}.`
        : `${product.name} was added with ${product.inventory?.quantity ?? 0} ready items.`)
      await load()
      if (onCreated) await onCreated(product)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We could not save this menu item.')
    } finally {
      setSaving(false)
    }
  }

  return <Stack spacing={3}>
    {embedded ? <Paper elevation={0} sx={{ p: { xs: 2.25, sm: 2.5 }, border: '1px solid #e1e9f1', borderRadius: 2.25, bgcolor: 'var(--ls-surface)' }}><Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} alignItems={{ md: 'center' }}><Box><Typography sx={{ color: 'var(--ls-text)', fontSize: 19, fontWeight: 900 }}>Menu items stock ledger</Typography><Typography variant="body2" sx={{ mt: .35, color: 'var(--ls-text-muted)' }}>Edit quantities and set thresholds below. Low items show amber warnings.</Typography></Box><Stack direction="row" spacing={.8} sx={{ width: { xs: '100%', md: 430 } }}><TextField size="small" value={quickName} onChange={(event) => setQuickName(event.target.value)} placeholder="Add new ready menu item..." fullWidth sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--ls-surface-muted)', borderRadius: 1.5 }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--ls-border)' } }} /><Button variant="contained" onClick={() => { setError(''); setForm({ ...emptyForm(), name: quickName }); setQuickName(''); setOpen(true) }} sx={{ minWidth: 68, bgcolor: 'var(--ls-primary)', fontWeight: 900, textTransform: 'none', '&:hover': { bgcolor: '#007d70' } }}>Add</Button></Stack></Stack></Paper> : <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2} alignItems={{ sm: 'center' }}><Box><Typography variant="h4" fontWeight={900}>Menu items</Typography><Typography color="text.secondary">Create ready-to-sell items or meals made from ingredient recipes.</Typography></Box><Button variant="contained" onClick={() => { setError(''); setOpen(true) }}>Add menu item</Button></Stack>}

    {!open && error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
    {!embedded && notice && <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert>}

    {!embedded &&     <Stack spacing={1.5}>
      {products.map((product) => <Paper key={product.id} sx={{ p: 2.25 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap"><Typography fontWeight={900}>{product.name}</Typography><Chip size="small" label={product.stock_mode === 'ingredient_recipe' ? 'Made from ingredients' : 'Ready item'} color={product.stock_mode === 'ingredient_recipe' ? 'secondary' : 'primary'} /></Stack>
            <Typography variant="body2" color="text.secondary">{product.category} · RM {Number(product.price).toFixed(2)} · {availabilityText(product)}</Typography>
          </Box>
          <Typography color={product.availableQuantity === 0 ? 'error.main' : 'text.secondary'} variant="body2">{product.is_available ? 'Visible to customers' : 'Hidden from customers'}</Typography>
        </Stack>
      </Paper>)}
      {!products.length && <Alert severity="info">No menu items yet. Add your first item to begin.</Alert>}
    </Stack>}

    <Dialog open={open} onClose={closeForm} maxWidth="md" fullWidth slotProps={{ paper: { sx: { maxWidth: 800, borderRadius: 2.25, bgcolor: 'var(--ls-surface)', overflow: 'hidden' } } }}>
      <DialogTitle sx={{ px: { xs: 2.5, sm: 4 }, py: 3.25, color: '#081a3e', fontSize: { xs: 25, sm: 29 }, fontWeight: 900, borderBottom: '1px solid #e8eef4' }}>Add menu item</DialogTitle>
      <DialogContent sx={{ px: { xs: 2.5, sm: 4 }, py: { xs: 2.75, sm: 3.5 } }}><Stack spacing={3.25}>{error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
        <Box><Typography sx={{ color: 'var(--ls-text-muted)', fontSize: 12, fontWeight: 900, letterSpacing: .5 }}>ITEM DETAILS</Typography><Typography variant="body2" sx={{ mt: .45, color: 'var(--ls-text-secondary)' }}>The selling price is shown to customers; cost price stays for vendor analytics.</Typography></Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.75}>
          <TextField required label="Name *" placeholder="e.g. Cheese Burger Supreme" value={form.name} onChange={(event) => setField('name', event.target.value)} fullWidth sx={formFieldSx} />
          <TextField required select label="Category *" value={form.category} onChange={(event) => setField('category', event.target.value)} fullWidth sx={formFieldSx}>{['Meals', 'Drinks', 'Snacks', 'Desserts'].map((category) => <MenuItem key={category} value={category}>{category}</MenuItem>)}</TextField>
        </Stack>
        <TextField label="Description" placeholder="Add menu item description here..." value={form.description} onChange={(event) => setField('description', event.target.value)} multiline minRows={3} fullWidth sx={formFieldSx} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.75}>
          <TextField required label="Selling price (RM) *" placeholder="0.00" type="number" value={form.price} onChange={(event) => setField('price', event.target.value)} fullWidth inputProps={{ min: 0, step: 0.01 }} sx={formFieldSx} />
          <TextField required label="Cost price (RM) *" placeholder="0.00" type="number" value={form.costPrice} onChange={(event) => setField('costPrice', event.target.value)} fullWidth inputProps={{ min: 0, step: 0.01 }} sx={formFieldSx} />
        </Stack>

        <Divider sx={{ borderColor: '#edf1f5' }} />
        <Box><Typography sx={{ color: 'var(--ls-text-muted)', fontSize: 12, fontWeight: 900, letterSpacing: .5 }}>STOCK METHOD</Typography><Typography variant="body2" sx={{ mt: .45, color: 'var(--ls-text-secondary)' }}>This choice stays fixed after creation so stock remains reliable.</Typography></Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.75}>
          <Button variant="outlined" onClick={() => setField('stockMode', 'ready_item')} sx={{ flex: 1, minHeight: 96, alignItems: 'flex-start', justifyContent: 'flex-start', p: 2.8, textAlign: 'left', borderRadius: 1.7, borderColor: form.stockMode === 'ready_item' ? '#109b8b' : 'var(--ls-border)', bgcolor: form.stockMode === 'ready_item' ? '#129c8e' : '#fff', color: form.stockMode === 'ready_item' ? '#fff' : 'var(--ls-text)', boxShadow: form.stockMode === 'ready_item' ? '0 9px 18px rgba(0,137,121,.18)' : 'none', '&:hover': { borderColor: '#109b8b', bgcolor: form.stockMode === 'ready_item' ? '#0d867a' : '#f3fffc' } }}><Stack alignItems="flex-start" spacing={.65}><Typography sx={{ fontWeight: 900 }}>READY ITEM</Typography><Typography variant="caption" sx={{ color: form.stockMode === 'ready_item' ? '#d8fff6' : '#607695', fontWeight: 800 }}>TRACK FINISHED-ITEM QUANTITY.</Typography></Stack></Button>
          <Button variant="outlined" onClick={() => setField('stockMode', 'ingredient_recipe')} sx={{ flex: 1, minHeight: 96, alignItems: 'flex-start', justifyContent: 'flex-start', p: 2.8, textAlign: 'left', borderRadius: 1.7, borderColor: form.stockMode === 'ingredient_recipe' ? 'var(--ls-purple)' : 'var(--ls-border)', bgcolor: form.stockMode === 'ingredient_recipe' ? 'var(--ls-purple)' : '#fff', color: form.stockMode === 'ingredient_recipe' ? '#fff' : 'var(--ls-text)', boxShadow: form.stockMode === 'ingredient_recipe' ? '0 9px 18px rgba(126,34,206,.16)' : 'none', '&:hover': { borderColor: 'var(--ls-purple)', bgcolor: form.stockMode === 'ingredient_recipe' ? '#741fca' : '#fcf9ff' } }}><Stack alignItems="flex-start" spacing={.65}><Typography sx={{ fontWeight: 900 }}>MADE FROM INGREDIENTS</Typography><Typography variant="caption" sx={{ color: form.stockMode === 'ingredient_recipe' ? '#f4e8ff' : 'var(--ls-purple)', fontWeight: 800 }}>CALCULATE AVAILABILITY FROM A RECIPE.</Typography></Stack></Button>
        </Stack>

        {form.stockMode === 'ready_item' && <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.75}><TextField required label="Ready-item quantity" type="number" value={form.quantity} onChange={(event) => setField('quantity', event.target.value)} inputProps={{ min: 0, step: 1 }} fullWidth sx={formFieldSx} /><TextField required label="Reorder point" type="number" value={form.reorderLevel} onChange={(event) => setField('reorderLevel', event.target.value)} inputProps={{ min: 0, step: 1 }} fullWidth sx={formFieldSx} /></Stack>}

        {form.stockMode === 'ingredient_recipe' && <Stack spacing={2.25}>
          <Box><Typography sx={{ color: 'var(--ls-text)', fontWeight: 900 }}>Recipe setup</Typography><Typography variant="body2" sx={{ mt: .35, color: 'var(--ls-text-secondary)' }}>Use an existing ingredient or add a new one. Nothing is created until you save this menu item.</Typography></Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
            <Button variant="outlined" onClick={() => requestAiRecipe()} disabled={aiLoading || form.name.trim().length < 2} sx={{ borderColor: '#ead9ff', bgcolor: 'var(--ls-purple-soft)', color: 'var(--ls-purple)', fontWeight: 900, textTransform: 'none' }}>{aiLoading ? 'Preparing recipe...' : 'Suggest recipe with AI'}</Button>
            <Button variant="outlined" onClick={() => addRecipeRow('existing')} disabled={!ingredients.length || aiLoading} sx={{ borderColor: 'var(--ls-border)', color: 'var(--ls-text)', fontWeight: 900, textTransform: 'none' }}>+ Add ingredient</Button>
            <Button variant="outlined" onClick={() => addRecipeRow('new')} disabled={aiLoading} sx={{ borderColor: '#ead9ff', color: 'var(--ls-purple)', fontWeight: 900, textTransform: 'none' }}>+ Add raw material</Button>
          </Stack>
          {form.name.trim().length < 2 && <Typography variant="caption" sx={{ color: '#8e9db1', fontStyle: 'italic' }}>Enter the menu-item name above to enable an AI suggestion.</Typography>}
          {clarification && <Paper variant="outlined" sx={{ p: 2, borderColor: '#d8b4fe', bgcolor: '#fcfaff' }}><Stack spacing={1.5}><Box><Typography sx={{ color: '#4c1d95', fontWeight: 900 }}>One question before the draft</Typography><Typography variant="body2" sx={{ mt: .35, color: '#6b5b87' }}>{clarification.prompt}</Typography></Box><TextField select label="Your answer" value={clarificationAnswer} onChange={(event) => setClarificationAnswer(event.target.value)} fullWidth sx={formFieldSx}><MenuItem value="">Choose an answer</MenuItem>{clarification.options.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}</TextField><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}><Button variant="contained" onClick={() => requestAiRecipe({ questionId: clarification.id, answer: clarificationAnswer })} disabled={!clarificationAnswer || aiLoading} sx={{ bgcolor: 'var(--ls-purple)', fontWeight: 900, textTransform: 'none' }}>{aiLoading ? 'Preparing recipe...' : 'Apply answer'}</Button><Button onClick={() => { setClarification(null); setClarificationAnswer('') }} disabled={aiLoading} sx={{ textTransform: 'none' }}>Set up manually instead</Button></Stack></Stack></Paper>}
          {form.recipe.some((row) => row.aiSuggested) && <Alert severity="warning">AI has suggested a common recipe. Check every ingredient and quantity before saving.</Alert>}
          {form.recipe.map((row, index) => row.type === 'existing'
            ? <Paper key={index} variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, borderColor: 'var(--ls-border)', borderRadius: 1.5, bgcolor: '#fbfcfe' }}><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.35} alignItems={{ sm: 'center' }}><TextField select label="Ingredient" value={row.ingredientId} onChange={(event) => updateRecipeRow(index, { ingredientId: event.target.value })} sx={{ flex: 1, ...formFieldSx }} disabled={!ingredients.length}><MenuItem value="">Choose an ingredient</MenuItem>{ingredients.map((ingredient) => <MenuItem key={ingredient.id} value={ingredient.id}>{ingredient.name} ({ingredient.unit}) - {ingredient.quantity} available</MenuItem>)}</TextField><TextField label="Per serving" type="number" value={row.quantityPerServing} onChange={(event) => updateRecipeRow(index, { quantityPerServing: event.target.value })} inputProps={{ min: 0.01, step: 0.01 }} sx={{ width: { sm: 150 }, ...formFieldSx }} /><Button color="error" onClick={() => removeRecipeRow(index)} sx={{ fontWeight: 900, textTransform: 'none' }}>Remove</Button></Stack></Paper>
            : <Paper key={index} variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, borderColor: '#e9d5ff', borderRadius: 1.5, bgcolor: '#fdfaff' }}><Stack spacing={1.5}><Stack direction="row" justifyContent="space-between" alignItems="center"><Typography sx={{ color: '#6b21a8', fontSize: 12, fontWeight: 900, letterSpacing: .35 }}>CONFIGURE NEW RAW MATERIAL</Typography><Button color="error" onClick={() => removeRecipeRow(index)} sx={{ minWidth: 0, p: .25, fontSize: 12, fontWeight: 900, textTransform: 'none' }}>Remove</Button></Stack><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}><TextField label="Ingredient name" placeholder="Ingredient name..." value={row.newIngredient.name} onChange={(event) => updateInlineIngredient(index, 'name', event.target.value)} fullWidth sx={formFieldSx} /><TextField label="Starting qty" placeholder="Starting qty..." type="number" value={row.newIngredient.quantity} onChange={(event) => updateInlineIngredient(index, 'quantity', event.target.value)} inputProps={{ min: 0, step: 0.01 }} fullWidth sx={formFieldSx} /><TextField label="Reorder threshold" placeholder="Reorder threshold..." type="number" value={row.newIngredient.reorderLevel} onChange={(event) => updateInlineIngredient(index, 'reorderLevel', event.target.value)} inputProps={{ min: 0, step: 0.01 }} fullWidth sx={formFieldSx} /></Stack><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} alignItems={{ sm: 'center' }}><TextField label="Unit" value={row.newIngredient.unit} onChange={(event) => updateInlineIngredient(index, 'unit', event.target.value)} sx={{ width: { sm: 170 }, ...formFieldSx }} /><TextField label="Per serving" type="number" value={row.quantityPerServing} onChange={(event) => updateRecipeRow(index, { quantityPerServing: event.target.value })} inputProps={{ min: 0.01, step: 0.01 }} sx={{ width: { sm: 170 }, ...formFieldSx }} /></Stack></Stack></Paper>)}
          {!form.recipe.length && <Alert severity="info" sx={{ bgcolor: '#edf8ff', border: '1px solid #cce9ff' }}>Add an ingredient, then choose it from the existing-ingredient list. Add a raw material only when it is not listed.</Alert>}
        </Stack>}
      </Stack></DialogContent>
      <DialogActions sx={{ px: { xs: 2.5, sm: 4 }, py: 2.5, borderTop: '1px solid #edf1f5' }}><Button onClick={closeForm} disabled={saving} sx={{ border: '1px solid #dce6ef', borderRadius: 1.3, px: 2.4, color: 'var(--ls-text-secondary)', fontWeight: 900, textTransform: 'none' }}>Cancel</Button><Button variant="contained" onClick={saveMenuItem} disabled={saving} sx={{ borderRadius: 1.3, px: 2.6, bgcolor: '#109b8b', fontWeight: 900, textTransform: 'none', boxShadow: '0 8px 16px rgba(0,137,121,.2)', '&:hover': { bgcolor: '#007d70' } }}>{saving ? 'Saving...' : 'Save menu item'}</Button></DialogActions>
    </Dialog>
  </Stack>
}

export default MenuItemsPage