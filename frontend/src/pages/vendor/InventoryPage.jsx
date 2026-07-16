import { useEffect, useState } from 'react'
import { Alert, Button, Paper, Stack, TextField, Typography } from '@mui/material'
import { getInventory, updateInventory } from '../../services/api'

function InventoryPage() {
  const [inventory, setInventory] = useState([])
  const [values, setValues] = useState({})
  const [error, setError] = useState('')

  function loadInventory() {
    getInventory().then(({ data }) => {
      setInventory(data.data)
      setValues(Object.fromEntries(data.data.map((item) => [item.products.id, { quantity: item.quantity, reorderLevel: item.reorder_level }])))
    }).catch(() => setError('We could not load inventory.'))
  }

  useEffect(() => { loadInventory() }, [])

  async function saveItem(productId) {
    try { await updateInventory(productId, values[productId]); loadInventory() } catch { setError('We could not update inventory.') }
  }

  return <Stack spacing={3}>
    <Stack spacing={0.5}><Typography variant="h4" fontWeight={900}>Inventory</Typography><Typography color="text.secondary">Update stock levels and reorder thresholds.</Typography></Stack>
    {error && <Alert severity="error">{error}</Alert>}
    {inventory.map((item) => <Paper key={item.id} sx={{ p: 2.5 }}><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}><Stack sx={{ flex: 1 }}><Typography fontWeight={800}>{item.products.name}</Typography><Typography color={item.isLowStock ? 'error' : 'text.secondary'} variant="body2">{item.isLowStock ? 'Low stock' : 'Stock level is healthy'}</Typography></Stack><TextField label="Quantity" type="number" size="small" value={values[item.products.id]?.quantity ?? ''} onChange={(event) => setValues({ ...values, [item.products.id]: { ...values[item.products.id], quantity: event.target.value } })} /><TextField label="Reorder at" type="number" size="small" value={values[item.products.id]?.reorderLevel ?? ''} onChange={(event) => setValues({ ...values, [item.products.id]: { ...values[item.products.id], reorderLevel: event.target.value } })} /><Button variant="outlined" onClick={() => saveItem(item.products.id)}>Save</Button></Stack></Paper>)}
  </Stack>
}

export default InventoryPage
