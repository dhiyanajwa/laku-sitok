import { useEffect, useState } from 'react'
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { createProduct, getIngredients, getProducts, suggestRecipeDraft } from '../../services/api'

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
      const [productsResponse, ingredientsResponse] = await Promise.all([getProducts(), getIngredients()])
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
      if (onCreated) await onCreated()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We could not save this menu item.')
    } finally {
      setSaving(false)
    }
  }

  return <Stack spacing={3}>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2} alignItems={{ sm: 'center' }}>
      <Box><Typography variant="h4" fontWeight={900}>Menu items</Typography><Typography color="text.secondary">Create ready-to-sell items or meals made from ingredient recipes.</Typography></Box>
      <Button variant="contained" onClick={() => { setError(''); setOpen(true) }}>{embedded ? 'Add new menu item' : 'Add menu item'}</Button>
    </Stack>

    {!open && error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
    {notice && <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert>}

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

    <Dialog open={open} onClose={closeForm} maxWidth="md" fullWidth>
      <DialogTitle>Add menu item</DialogTitle>
      <DialogContent dividers><Stack spacing={3} sx={{ pt: 1 }}>{error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
        <Box><Typography fontWeight={900}>Item details</Typography><Typography variant="body2" color="text.secondary">The selling price is shown to customers; cost price stays for vendor analytics.</Typography></Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField required label="Name" value={form.name} onChange={(event) => setField('name', event.target.value)} fullWidth />
          <TextField required label="Category" value={form.category} onChange={(event) => setField('category', event.target.value)} fullWidth />
        </Stack>
        <TextField label="Description" value={form.description} onChange={(event) => setField('description', event.target.value)} multiline minRows={2} fullWidth />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField required label="Selling price (RM)" type="number" value={form.price} onChange={(event) => setField('price', event.target.value)} fullWidth inputProps={{ min: 0, step: 0.01 }} />
          <TextField required label="Cost price (RM)" type="number" value={form.costPrice} onChange={(event) => setField('costPrice', event.target.value)} fullWidth inputProps={{ min: 0, step: 0.01 }} />
        </Stack>

        <Divider />
        <Box><Typography fontWeight={900}>Stock method</Typography><Typography variant="body2" color="text.secondary">This choice stays fixed after creation so stock remains reliable.</Typography></Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button variant={form.stockMode === 'ready_item' ? 'contained' : 'outlined'} onClick={() => setField('stockMode', 'ready_item')} sx={{ flex: 1, justifyContent: 'flex-start', p: 2, textAlign: 'left' }}><Stack alignItems="flex-start"><Typography fontWeight={800}>Ready item</Typography><Typography variant="caption">Track finished-item quantity.</Typography></Stack></Button>
          <Button variant={form.stockMode === 'ingredient_recipe' ? 'contained' : 'outlined'} color="secondary" onClick={() => setField('stockMode', 'ingredient_recipe')} sx={{ flex: 1, justifyContent: 'flex-start', p: 2, textAlign: 'left' }}><Stack alignItems="flex-start"><Typography fontWeight={800}>Made from ingredients</Typography><Typography variant="caption">Calculate availability from a recipe.</Typography></Stack></Button>
        </Stack>

        {form.stockMode === 'ready_item' && <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}><TextField required label="Ready-item quantity" type="number" value={form.quantity} onChange={(event) => setField('quantity', event.target.value)} inputProps={{ min: 0, step: 1 }} fullWidth /><TextField required label="Reorder at" type="number" value={form.reorderLevel} onChange={(event) => setField('reorderLevel', event.target.value)} inputProps={{ min: 0, step: 1 }} fullWidth /></Stack>}

        {form.stockMode === 'ingredient_recipe' && <Stack spacing={2}>
          <Box><Typography fontWeight={900}>Recipe</Typography><Typography variant="body2" color="text.secondary">Use an existing ingredient or add a new one. Nothing is created until you save this menu item.</Typography></Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
            <Button variant="contained" color="secondary" onClick={() => requestAiRecipe()} disabled={aiLoading || form.name.trim().length < 2}>{aiLoading ? 'Preparing suggested recipe…' : 'Suggest recipe with AI'}</Button>
            <Button variant="outlined" onClick={() => addRecipeRow('existing')} disabled={!ingredients.length || aiLoading}>Add ingredient</Button>
          </Stack>
          {form.name.trim().length < 2 && <Typography variant="caption" color="text.secondary">Enter the menu-item name to enable an AI suggestion.</Typography>}
          {clarification && <Paper variant="outlined" sx={{ p: 2, borderColor: 'secondary.main' }}>
            <Stack spacing={1.5}>
              <Box><Typography fontWeight={800}>One question before the draft</Typography><Typography variant="body2" color="text.secondary">{clarification.prompt}</Typography></Box>
              <TextField select label="Your answer" value={clarificationAnswer} onChange={(event) => setClarificationAnswer(event.target.value)} fullWidth>
                <MenuItem value="">Choose an answer</MenuItem>
                {clarification.options.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
              </TextField>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button variant="contained" color="secondary" onClick={() => requestAiRecipe({ questionId: clarification.id, answer: clarificationAnswer })} disabled={!clarificationAnswer || aiLoading}>{aiLoading ? 'Preparing suggested recipe…' : 'Apply answer'}</Button>
                <Button onClick={() => { setClarification(null); setClarificationAnswer('') }} disabled={aiLoading}>Set up manually instead</Button>
              </Stack>
            </Stack>
          </Paper>}
          {form.recipe.some((row) => row.aiSuggested) && <Alert severity="warning">AI has suggested a common recipe. Check every ingredient and quantity before saving; only confirmed items affect stock.</Alert>}
          {form.recipe.map((row, index) => <Paper key={index} variant="outlined" sx={{ p: 2 }}>
            {row.type === 'existing'
              ? <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                <Chip label="Existing ingredient" size="small" color="primary" />{row.aiSuggested && <Chip label={row.aiConfidence === 'high' ? 'AI match' : 'AI suggested'} size="small" color={row.aiConfidence === 'high' ? 'success' : 'warning'} />}
                <TextField select label="Ingredient" value={row.ingredientId} onChange={(event) => updateRecipeRow(index, { ingredientId: event.target.value })} sx={{ flex: 1 }} disabled={!ingredients.length}><MenuItem value="">Choose an ingredient</MenuItem>{ingredients.map((ingredient) => <MenuItem key={ingredient.id} value={ingredient.id}>{ingredient.name} ({ingredient.unit}) Â· {ingredient.quantity} available</MenuItem>)}</TextField>
                <TextField label="Per serving" type="number" value={row.quantityPerServing} onChange={(event) => updateRecipeRow(index, { quantityPerServing: event.target.value })} inputProps={{ min: 0.01, step: 0.01 }} sx={{ width: { sm: 150 } }} />
                <Button color="error" onClick={() => removeRecipeRow(index)}>Remove</Button>
              </Stack>
              : <Stack spacing={1.5}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                  <Chip label="New ingredient" size="small" color="secondary" />{row.aiSuggested && <Chip label="AI needs review" size="small" color="warning" />}
                  <TextField label="Ingredient name" value={row.newIngredient.name} onChange={(event) => updateInlineIngredient(index, 'name', event.target.value)} sx={{ flex: 1 }} />
                  <TextField label="Per serving" type="number" value={row.quantityPerServing} onChange={(event) => updateRecipeRow(index, { quantityPerServing: event.target.value })} inputProps={{ min: 0.01, step: 0.01 }} sx={{ width: { sm: 150 } }} />
                  <Button color="error" onClick={() => removeRecipeRow(index)}>Remove</Button>
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField label="Current quantity" type="number" value={row.newIngredient.quantity} onChange={(event) => updateInlineIngredient(index, 'quantity', event.target.value)} inputProps={{ min: 0, step: 0.01 }} />
                  <TextField label="Unit" value={row.newIngredient.unit} onChange={(event) => updateInlineIngredient(index, 'unit', event.target.value)} />
                  <TextField label="Reorder at" type="number" value={row.newIngredient.reorderLevel} onChange={(event) => updateInlineIngredient(index, 'reorderLevel', event.target.value)} inputProps={{ min: 0, step: 0.01 }} />
                </Stack>
              </Stack>}
          </Paper>)}
          <Button variant="outlined" color="secondary" onClick={() => addRecipeRow('new')} sx={{ alignSelf: 'flex-start' }}>Add new ingredient</Button>
          {!form.recipe.length && <Alert severity="info">Add an ingredient, then choose it from the existing-ingredient list. Add a new ingredient only when it is not listed.</Alert>}
        </Stack>}
      </Stack></DialogContent>
      <DialogActions><Button onClick={closeForm} disabled={saving}>Cancel</Button><Button variant="contained" onClick={saveMenuItem} disabled={saving}>{saving ? 'Saving…' : 'Save menu item'}</Button></DialogActions>
    </Dialog>
  </Stack>
}

export default MenuItemsPage