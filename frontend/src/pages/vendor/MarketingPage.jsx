import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogContent, DialogTitle, Divider, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { approveMarketingCampaign, generateMarketingCampaign, getMarketingCampaigns, getMarketingProducts, getMarketingSettings, recordMarketingShare, updateMarketingCampaign, updateMarketingSettings } from '../../services/api'

function statusColor(status) {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'error'
  return 'warning'
}

function formatDate(value) { return new Intl.DateTimeFormat('en-MY', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }

function campaignText(campaign) {
  const tags = campaign.hashtags?.length ? `\n\n${campaign.hashtags.map((tag) => `#${tag}`).join(' ')}` : ''
  return `${campaign.caption}${campaign.callToAction ? `\n\n${campaign.callToAction}` : ''}${tags}`
}

function MarketingPage() {
  const [products, setProducts] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [settings, setSettings] = useState({ brandTone: 'warm and friendly', language: 'English', location: '', operatingHours: '', hashtagsEnabled: true })
  const [productId, setProductId] = useState('')
  const [campaign, setCampaign] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)

  const eligibleDescription = useMemo(() => products.length ? `${products.length} product${products.length === 1 ? '' : 's'} can be promoted because stock is above the reorder level.` : 'No product currently has stock above its reorder level.', [products])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [productResponse, campaignResponse, settingsResponse] = await Promise.all([getMarketingProducts(), getMarketingCampaigns(), getMarketingSettings()])
      const nextProducts = productResponse.data.data
      const nextCampaigns = campaignResponse.data.data
      setProducts(nextProducts)
      setCampaigns(nextCampaigns)
      setSettings(settingsResponse.data.data)
      setProductId((current) => current || nextProducts[0]?.id || '')
      setCampaign((current) => current ? nextCampaigns.find((item) => item.id === current.id) || null : nextCampaigns[0] || null)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load marketing campaigns. Run the marketing database migration first.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function generate() {
    if (!productId || generating) return
    setGenerating(true); setError(''); setNotice('')
    try {
      const response = await generateMarketingCampaign({ productId, tone: settings.brandTone, language: settings.language })
      const nextCampaign = response.data.data.campaign
      setCampaign(nextCampaign)
      setCampaigns((items) => [nextCampaign, ...items])
      setNotice('Draft generated from the current product price and verified stock. Review it before sharing.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The Marketing Agent could not create a draft.')
    } finally { setGenerating(false) }
  }

  function editCurrent(field, value) { setCampaign((current) => current ? { ...current, [field]: value } : current) }

  async function saveCampaign() {
    if (!campaign || saving || campaign.status !== 'draft') return
    setSaving(true); setError(''); setNotice('')
    try {
      const response = await updateMarketingCampaign(campaign.id, { title: campaign.title, caption: campaign.caption, callToAction: campaign.callToAction, hashtags: campaign.hashtags })
      replaceCampaign(response.data.data)
      setNotice('Draft saved.')
    } catch (requestError) { setError(requestError.response?.data?.message || 'Could not save this draft.') } finally { setSaving(false) }
  }

  function replaceCampaign(nextCampaign) {
    setCampaign(nextCampaign)
    setCampaigns((items) => items.map((item) => item.id === nextCampaign.id ? nextCampaign : item))
  }

  async function approve() {
    if (!campaign || saving) return
    setSaving(true); setError(''); setNotice('')
    try {
      const response = await approveMarketingCampaign(campaign.id)
      replaceCampaign(response.data.data)
      setNotice('Campaign approved. It is ready for your WhatsApp Status share flow.')
    } catch (requestError) { setError(requestError.response?.data?.message || 'Could not approve this campaign.') } finally { setSaving(false) }
  }

  function openShareDialog() {
    setError('')
    setNotice('')
    setShareDialogOpen(true)
  }

  async function shareWhatsApp() {
    if (!campaign) return
    setError(''); setNotice('')
    try {
      await recordMarketingShare(campaign.id, 'whatsapp')
      window.location.assign(`https://api.whatsapp.com/send?text=${encodeURIComponent(campaignText(campaign))}`)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not open WhatsApp. You can still copy the caption manually.')
    }
  }

  async function copyCaption() {
    if (!campaign) return
    try { await navigator.clipboard.writeText(campaignText(campaign)); setNotice('Caption copied.') } catch { setError('Your browser did not allow copying. Select and copy the caption manually.') }
  }

  async function saveSettings() {
    setSaving(true); setError(''); setNotice('')
    try { const response = await updateMarketingSettings(settings); setSettings(response.data.data); setNotice('Marketing preferences saved.') } catch (requestError) { setError(requestError.response?.data?.message || 'Could not save marketing preferences.') } finally { setSaving(false) }
  }

  return <><Stack spacing={3} maxWidth={1060}>
    <Box><Typography variant="h4" fontWeight={900}>Marketing Agent</Typography><Typography color="text.secondary">Create stock-verified promotions, review every word, then share them yourself. Facebook publishing is intentionally not connected yet.</Typography></Box>
    {error && <Alert severity="error">{error}</Alert>}
    {notice && <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert>}

    <Card><CardContent><Stack spacing={2}><Box><Typography variant="h6" fontWeight={800}>Create a promotion</Typography><Typography variant="body2" color="text.secondary">{eligibleDescription}</Typography></Box><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField select fullWidth label="Product to promote" value={productId} onChange={(event) => setProductId(event.target.value)} disabled={loading || !products.length}>{products.map((product) => <MenuItem key={product.id} value={product.id}>{product.name} — RM {product.price.toFixed(2)} ({product.quantity} in stock)</MenuItem>)}</TextField><Button variant="contained" onClick={generate} disabled={generating || !productId} sx={{ minWidth: 170 }}>{generating ? 'Generating…' : 'Generate draft'}</Button></Stack><Alert severity="info">The agent uses the current product price and stock. It cannot publish anything automatically. In WhatsApp, choose My Status to post it as a Status.</Alert></Stack></CardContent></Card>

    <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start">
      <Card sx={{ width: { xs: '100%', md: 300 }, flexShrink: 0 }}><CardContent><Stack spacing={1.5}><Typography fontWeight={800}>Campaigns</Typography>{campaigns.length === 0 && <Typography color="text.secondary" variant="body2">No drafts yet.</Typography>}{campaigns.map((item) => <Button key={item.id} variant={campaign?.id === item.id ? 'contained' : 'outlined'} color="inherit" onClick={() => setCampaign(item)} sx={{ justifyContent: 'flex-start', textAlign: 'left', textTransform: 'none' }}><Stack alignItems="flex-start"><Typography fontWeight={700}>{item.productName}</Typography><Typography variant="caption">{formatDate(item.createdAt)}</Typography><Chip size="small" label={item.status} color={statusColor(item.status)} sx={{ mt: .5 }} /></Stack></Button>)}</Stack></CardContent></Card>
      <Stack spacing={3} sx={{ width: '100%' }}>
        {campaign ? <><Card><CardContent><Stack spacing={2}><Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography variant="h6" fontWeight={800}>{campaign.productName} — RM {campaign.productPrice.toFixed(2)}</Typography><Typography variant="body2" color="text.secondary">{campaign.reason || 'Owner-reviewable promotion draft.'}</Typography></Box><Chip label={campaign.status} color={statusColor(campaign.status)} /></Stack><TextField label="Post title" value={campaign.title} onChange={(event) => editCurrent('title', event.target.value)} disabled={campaign.status !== 'draft'} /><TextField label="Caption" value={campaign.caption} onChange={(event) => editCurrent('caption', event.target.value)} multiline minRows={5} disabled={campaign.status !== 'draft'} inputProps={{ maxLength: 1000 }} /><TextField label="Call to action" value={campaign.callToAction} onChange={(event) => editCurrent('callToAction', event.target.value)} disabled={campaign.status !== 'draft'} /><TextField label="Hashtags (comma separated)" value={campaign.hashtags.join(', ')} onChange={(event) => editCurrent('hashtags', event.target.value.split(',').map((tag) => tag.trim().replace(/^#/, '')).filter(Boolean))} disabled={campaign.status !== 'draft'} /><Stack direction="row" flexWrap="wrap" gap={1}>{campaign.status === 'draft' && <><Button variant="outlined" onClick={saveCampaign} disabled={saving}>Save changes</Button><Button variant="contained" color="success" onClick={approve} disabled={saving}>Approve for sharing</Button></>}{campaign.status === 'approved' && <><Button variant="contained" onClick={openShareDialog}>Share campaign</Button><Button variant="outlined" onClick={copyCaption}>Copy caption</Button></>}</Stack></Stack></CardContent></Card>
          <Card><CardContent><Typography variant="h6" fontWeight={800} gutterBottom>Post preview</Typography><Typography variant="subtitle1" fontWeight={700}>{campaign.title}</Typography><Typography sx={{ whiteSpace: 'pre-wrap' }}>{campaignText(campaign)}</Typography></CardContent></Card>
          <Card><CardContent><Typography variant="h6" fontWeight={800} gutterBottom>Campaign activity</Typography><Stack spacing={1}>{campaign.activity?.map((event) => <Box key={event.id}><Typography fontWeight={700} variant="body2">{event.type.replaceAll('_', ' ')}</Typography><Typography variant="body2">{event.detail}</Typography><Typography variant="caption" color="text.secondary">{formatDate(event.createdAt)}</Typography><Divider sx={{ mt: 1 }} /></Box>)}</Stack></CardContent></Card>
        </> : <Alert severity="info">Generate a campaign draft to begin.</Alert>}
      </Stack>
    </Stack>

    <Card><CardContent><Stack spacing={2}><Typography variant="h6" fontWeight={800}>Marketing preferences</Typography><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField fullWidth label="Brand tone" value={settings.brandTone} onChange={(event) => setSettings((current) => ({ ...current, brandTone: event.target.value }))} /><TextField fullWidth label="Language" value={settings.language} onChange={(event) => setSettings((current) => ({ ...current, language: event.target.value }))} /></Stack><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField fullWidth label="Location (optional)" value={settings.location} onChange={(event) => setSettings((current) => ({ ...current, location: event.target.value }))} /><TextField fullWidth label="Operating hours (optional)" value={settings.operatingHours} onChange={(event) => setSettings((current) => ({ ...current, operatingHours: event.target.value }))} /></Stack><Button onClick={saveSettings} disabled={saving} sx={{ alignSelf: 'flex-start' }}>Save preferences</Button></Stack></CardContent></Card>
  </Stack>
    <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)} fullWidth maxWidth="xs">
      <DialogTitle>Share campaign</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pb: 1 }}>
          <Typography color="text.secondary">Choose where to open this approved campaign. You remain in control of the final post.</Typography>
          <Button variant="contained" onClick={shareWhatsApp} sx={{ justifyContent: 'flex-start', py: 1.4, bgcolor: '#25D366', '&:hover': { bgcolor: '#1fae55' } }}><Box component="span" sx={{ width: 28, height: 28, mr: 1.5, borderRadius: '50%', bgcolor: 'white', color: '#25D366', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>W</Box>WhatsApp</Button>
          {/* Facebook sharing is deferred. Restore this option only when the public OG campaign page is deployed and ready to test. */}
          <Typography variant="caption" color="text.secondary">WhatsApp opens the approved caption. Facebook sharing is planned for a later phase.</Typography>
          <Button onClick={() => setShareDialogOpen(false)} sx={{ alignSelf: 'flex-end' }}>Cancel</Button>
        </Stack>
      </DialogContent>
    </Dialog></>
}

export default MarketingPage







