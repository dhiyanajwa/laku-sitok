import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Chip, Dialog, DialogContent, DialogTitle, Divider, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import MarketingTagField from '../../components/MarketingTagField'
import { approveMarketingCampaign, generateMarketingCampaign, getMarketingCampaigns, getMarketingProducts, getMarketingSettings, recordMarketingShare, updateMarketingCampaign, updateMarketingSettings } from '../../services/api'

const campaignTypes = [
  { id: 'stall_opening', label: "We're open now", helper: 'Tell customers the stall is ready.' },
  { id: 'opening_later', label: 'Opening later', helper: 'Let customers know when to come by.' },
  { id: 'today_special', label: "Today's special", helper: 'Optionally highlight one available menu item.' },
  { id: 'closing_soon', label: 'Closing soon', helper: 'Share a final reminder before closing.' },
]

const defaultSettings = { location: '', operatingHours: '', sellingPoints: [], defaultHashtags: [], hashtagsEnabled: true }
const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 1.65, bgcolor: 'var(--ls-surface-muted)', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--ls-border)' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#aabfd5' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--ls-primary)' } }, '& .MuiInputLabel-root': { color: 'var(--ls-text-muted)', fontSize: 12, fontWeight: 900, letterSpacing: .2 } }

function statusColor(status) {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'error'
  return 'warning'
}

function formatDate(value) { return new Intl.DateTimeFormat('en-MY', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
function priceText(value) { return value === null || value === undefined ? '' : ` - RM ${Number(value).toFixed(2)}` }
function campaignText(campaign) { const tags = campaign.hashtags?.length ? `\n\n${campaign.hashtags.map((tag) => `#${tag}`).join(' ')}` : ''; return `${campaign.caption}${campaign.callToAction ? `\n\n${campaign.callToAction}` : ''}${tags}` }
function campaignLabel(campaign) { return campaignTypes.find((type) => type.id === campaign.campaignType)?.label || (campaign.productName ? 'Product promotion' : 'Opening post') }

function PanelHeading({ icon, children }) {
  return <Stack direction="row" spacing={1} alignItems="center" sx={{ pb: 1.5, borderBottom: '1px solid #e8eef4' }}><Box sx={{ color: 'var(--ls-primary)', fontSize: 19, lineHeight: 1 }}>{icon}</Box><Typography sx={{ color: 'var(--ls-text)', fontSize: 15, letterSpacing: .35, fontWeight: 900, textTransform: 'uppercase' }}>{children}</Typography></Stack>
}

function MarketingPage() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [settings, setSettings] = useState(defaultSettings)
  const [campaignType, setCampaignType] = useState('stall_opening')
  const [dailyNote, setDailyNote] = useState('')
  const [highlightProductId, setHighlightProductId] = useState('')
  const [campaign, setCampaign] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)

  const profileMissing = useMemo(() => [!settings.location && 'location', !settings.operatingHours && 'operating hours'].filter(Boolean), [settings.location, settings.operatingHours])
  const selectedType = campaignTypes.find((type) => type.id === campaignType)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [productResponse, campaignResponse, settingsResponse] = await Promise.all([getMarketingProducts(), getMarketingCampaigns(), getMarketingSettings()])
      const nextCampaigns = campaignResponse.data.data
      setProducts(productResponse.data.data)
      setCampaigns(nextCampaigns)
      setSettings((current) => ({ ...current, ...settingsResponse.data.data }))
      setCampaign((current) => current ? nextCampaigns.find((item) => item.id === current.id) || null : nextCampaigns[0] || null)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load marketing. Run the stall-opening marketing database migration first.')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function replaceCampaign(nextCampaign) {
    setCampaign(nextCampaign)
    setCampaigns((items) => {
      const index = items.findIndex((item) => item.id === nextCampaign.id)
      return index === -1 ? [nextCampaign, ...items] : items.map((item) => item.id === nextCampaign.id ? nextCampaign : item)
    })
  }

  async function generate() {
    if (generating) return
    setGenerating(true); setError(''); setNotice('')
    try {
      const response = await generateMarketingCampaign({ campaignType, dailyNote, highlightProductId: campaignType === 'today_special' ? highlightProductId || undefined : undefined })
      replaceCampaign(response.data.data.campaign)
      setNotice('Opening post created. Review every word before you approve it.')
    } catch (requestError) { setError(requestError.response?.data?.message || 'The Marketing Agent could not create an opening post.') } finally { setGenerating(false) }
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

  async function approve() {
    if (!campaign || saving) return
    setSaving(true); setError(''); setNotice('')
    try {
      const response = await approveMarketingCampaign(campaign.id)
      replaceCampaign(response.data.data)
      setNotice('Opening post approved. It is ready for WhatsApp Status.')
    } catch (requestError) { setError(requestError.response?.data?.message || 'Could not approve this campaign.') } finally { setSaving(false) }
  }

  async function saveAssets() {
    setSaving(true); setError(''); setNotice('')
    try {
      const response = await updateMarketingSettings({ sellingPoints: settings.sellingPoints, defaultHashtags: settings.defaultHashtags, hashtagsEnabled: settings.hashtagsEnabled })
      setSettings((current) => ({ ...current, ...response.data.data }))
      setNotice('Marketing assets saved.')
    } catch (requestError) { setError(requestError.response?.data?.message || 'Could not save marketing assets.') } finally { setSaving(false) }
  }

  async function shareWhatsApp() {
    if (!campaign) return
    setError(''); setNotice('')
    try {
      await recordMarketingShare(campaign.id, 'whatsapp')
      window.location.assign(`https://api.whatsapp.com/send?text=${encodeURIComponent(campaignText(campaign))}`)
    } catch (requestError) { setError(requestError.response?.data?.message || 'Could not open WhatsApp. You can still copy the approved post.') }
  }

  async function copyCaption() {
    if (!campaign) return
    try { await navigator.clipboard.writeText(campaignText(campaign)); setNotice('Approved post copied.') } catch { setError('Your browser did not allow copying. Select and copy the post manually.') }
  }

  return <Stack spacing={3.25} sx={{ maxWidth: 1240, mx: 'auto' }}>
    <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: 2.35, border: '1px solid #e0e9f2', background: 'linear-gradient(108deg, var(--ls-surface) 44%, var(--ls-primary-hover))' }}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}><Box><Typography variant="overline" sx={{ color: 'var(--ls-purple)', letterSpacing: 1.1, fontWeight: 900 }}>MARKETING AGENT</Typography><Typography component="h1" sx={{ mt: .2, color: 'var(--ls-text)', fontSize: { xs: 30, sm: 38 }, fontWeight: 900 }}>Open your stall, then spread the word.</Typography><Typography sx={{ mt: .8, maxWidth: 680, color: 'var(--ls-text-secondary)' }}>Create an owner-approved opening post and share it to WhatsApp Status when you are ready.</Typography></Box><Chip label={profileMissing.length ? 'Profile needs attention' : 'Profile ready'} color={profileMissing.length ? 'warning' : 'success'} variant="outlined" sx={{ alignSelf: { sm: 'start' }, fontWeight: 900 }} /></Stack></Paper>
    {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
    {notice && <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert>}

    <Paper elevation={0} sx={{ p: { xs: 2.25, sm: 3 }, border: '1px solid #dfe8f2', borderRadius: 2.2 }}><Stack spacing={2.1}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}><Box><Typography sx={{ color: 'var(--ls-text)', fontSize: 21, fontWeight: 900 }}>Create an opening post</Typography><Typography variant="body2" sx={{ mt: .4, color: 'var(--ls-text-muted)' }}>Choose the message for today; stable stall details stay in Settings.</Typography></Box><Button variant="outlined" onClick={() => navigate('/vendor/settings')} sx={{ alignSelf: { sm: 'start' }, borderColor: '#d8c4f9', color: 'var(--ls-purple)', textTransform: 'none', fontWeight: 900 }}>Edit stall profile</Button></Stack>
      {profileMissing.length > 0 ? <Alert severity="warning" action={<Button color="inherit" size="small" onClick={() => navigate('/vendor/settings')}>OPEN SETTINGS</Button>}>Add your {profileMissing.join(' and ')} in Settings before creating an opening post.</Alert> : <Stack direction="row" flexWrap="wrap" gap={1}>{campaignTypes.map((type) => <Chip key={type.id} label={type.label} onClick={() => setCampaignType(type.id)} sx={{ height: 40, px: .8, border: '1px solid', borderColor: campaignType === type.id ? 'var(--ls-purple)' : 'var(--ls-border)', bgcolor: campaignType === type.id ? 'var(--ls-purple-soft)' : 'var(--ls-surface)', color: campaignType === type.id ? 'var(--ls-purple)' : 'var(--ls-text-secondary)', fontWeight: 900 }} />)}</Stack>}
      {!profileMissing.length && <><Alert severity="info" sx={{ bgcolor: '#eff8ff', color: '#185a86' }}>{selectedType?.helper}</Alert><Stack direction={{ xs: 'column', md: 'row' }} spacing={2}><TextField fullWidth label="Anything customers should know today? (optional)" value={dailyNote} onChange={(event) => setDailyNote(event.target.value)} placeholder="Example: Fresh local favourites are ready" inputProps={{ maxLength: 240 }} disabled={loading || generating} sx={fieldSx} />{campaignType === 'today_special' && <TextField select fullWidth label="Optional menu highlight" value={highlightProductId} onChange={(event) => setHighlightProductId(event.target.value)} disabled={loading || generating} sx={{ ...fieldSx, minWidth: { md: 290 } }}><MenuItem value="">No item selected</MenuItem>{products.map((product) => <MenuItem key={product.id} value={product.id}>{product.name}{priceText(product.price)}</MenuItem>)}</TextField>}</Stack><Button variant="contained" onClick={generate} disabled={generating || loading} sx={{ alignSelf: 'flex-start', minHeight: 48, px: 2.7, borderRadius: 1.6, bgcolor: 'var(--ls-purple)', textTransform: 'none', fontWeight: 900, '&:hover': { bgcolor: '#5f16af' } }}>{generating ? 'Creating opening post...' : 'Create opening post'}</Button></>}
    </Stack></Paper>

    <Paper elevation={0} sx={{ p: { xs: 2.25, sm: 3 }, border: '1px solid #dfe8f2', borderRadius: 2.2 }}><Stack spacing={2.1}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}><Box><Typography sx={{ color: 'var(--ls-text)', fontSize: 21, fontWeight: 900 }}>Marketing assets</Typography><Typography variant="body2" sx={{ mt: .4, color: 'var(--ls-text-muted)' }}>Change these when your promotion needs a different angle.</Typography></Box><Button variant="outlined" onClick={saveAssets} disabled={saving || loading} sx={{ alignSelf: { sm: 'start' }, borderColor: 'var(--ls-primary)', color: 'var(--ls-primary)', textTransform: 'none', fontWeight: 900 }}>{saving ? 'Saving...' : 'Save marketing assets'}</Button></Stack><MarketingTagField label="Selling points (comma separated or Enter)" value={settings.sellingPoints} onChange={(sellingPoints) => setSettings((current) => ({ ...current, sellingPoints }))} placeholder="Type an asset and hit Enter..." helperText="Up to five facts you want the Marketing Agent to mention." maxItems={5} /><MarketingTagField label="Default hashtags (comma separated or Enter)" value={settings.defaultHashtags} onChange={(defaultHashtags) => setSettings((current) => ({ ...current, defaultHashtags }))} placeholder="Type a hashtag and hit Enter..." color="purple" maxItems={10} /></Stack></Paper>

    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(205px, .78fr) minmax(360px, 1.42fr) minmax(240px, .9fr)' }, gap: 2.5, alignItems: 'start' }}>
      <Paper elevation={0} sx={{ p: 2.25, border: '1px solid #dfe8f2', borderRadius: 2.1 }}><Stack spacing={1.6}><PanelHeading icon="◈">Opening posts</PanelHeading>{campaigns.length === 0 && <Typography variant="body2" sx={{ py: 2, color: 'var(--ls-text-muted)' }}>Your saved opening posts will appear here.</Typography>}{campaigns.map((item) => { const selected = campaign?.id === item.id; const statusStyle = item.status === 'approved' ? { bgcolor: '#e8f8ed', borderColor: '#b9e9c6', color: '#237a35' } : item.status === 'rejected' ? { bgcolor: '#fff0f0', borderColor: '#ffc9c9', color: '#bd3131' } : { bgcolor: '#fff7e6', borderColor: '#f5dc9c', color: '#a56600' }; return <Button key={item.id} onClick={() => setCampaign(item)} sx={{ minHeight: 118, justifyContent: 'space-between', alignItems: 'stretch', p: 1.8, borderRadius: 1.75, textAlign: 'left', textTransform: 'none', border: '1px solid', borderColor: selected ? '#008979' : 'var(--ls-border)', bgcolor: selected ? '#138678' : 'var(--ls-surface)', color: selected ? '#fff' : 'var(--ls-text)', '&:hover': { bgcolor: selected ? '#0c7468' : 'var(--ls-surface-muted)' } }}><Stack spacing={.75} alignItems="flex-start"><Typography sx={{ fontSize: 14, fontWeight: 900 }}>{campaignLabel(item)}</Typography><Typography sx={{ color: 'inherit', opacity: .72, fontSize: 11 }}>{formatDate(item.createdAt)}</Typography><Box sx={{ minWidth: 118, height: 28, px: 1.25, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 1.2, border: '1px solid', fontSize: 10, fontWeight: 900, letterSpacing: .35, textTransform: 'uppercase', ...(selected ? { bgcolor: '#58beb1', borderColor: '#58beb1', color: '#fff' } : statusStyle) }}>{item.status.replaceAll('_', ' ')}</Box></Stack><Typography sx={{ alignSelf: 'center', color: 'inherit', fontSize: 23, fontWeight: 700 }}>›</Typography></Button>})}</Stack></Paper>

      {campaign ? <Paper elevation={0} sx={{ p: { xs: 2.25, sm: 3 }, border: '1px solid #dfe8f2', borderRadius: 2.1 }}><Stack spacing={2.15}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}><Box><Stack direction="row" spacing={1} alignItems="center"><Typography sx={{ color: 'var(--ls-text)', fontSize: 20, fontWeight: 900 }}>{campaignLabel(campaign)}</Typography><Chip label={campaign.status} color={statusColor(campaign.status)} size="small" sx={{ fontWeight: 900 }} /></Stack><Typography sx={{ mt: .7, color: 'var(--ls-text-muted)', fontSize: 12 }}>{campaign.productName ? <>Optional highlight: <Box component="span" sx={{ color: 'var(--ls-primary)', textDecoration: 'underline', fontWeight: 800 }}>{campaign.productName}{priceText(campaign.productPrice)}</Box></> : 'Opening post from your saved stall profile.'}</Typography></Box></Stack><Divider sx={{ borderColor: 'var(--ls-border-subtle)' }} />
        <TextField label="Post title" value={campaign.title} onChange={(event) => editCurrent('title', event.target.value)} disabled={campaign.status !== 'draft'} sx={fieldSx} /><TextField label="Caption" value={campaign.caption} onChange={(event) => editCurrent('caption', event.target.value)} multiline minRows={6} disabled={campaign.status !== 'draft'} inputProps={{ maxLength: 1000 }} sx={fieldSx} /><TextField label="Call to action" value={campaign.callToAction} onChange={(event) => editCurrent('callToAction', event.target.value)} disabled={campaign.status !== 'draft'} sx={fieldSx} /><TextField label="Hashtags (comma separated)" value={campaign.hashtags.join(', ')} onChange={(event) => editCurrent('hashtags', event.target.value.split(',').map((tag) => tag.trim().replace(/^#/, '')).filter(Boolean))} disabled={campaign.status !== 'draft'} sx={fieldSx} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>{campaign.status === 'draft' && <><Button variant="outlined" onClick={saveCampaign} disabled={saving} sx={{ minHeight: 58, flex: 1, borderColor: '#d9c5f9', color: 'var(--ls-purple)', textTransform: 'none', fontWeight: 900 }}>Save changes</Button><Button variant="contained" onClick={approve} disabled={saving} sx={{ minHeight: 58, flex: 1, bgcolor: 'var(--ls-primary)', textTransform: 'none', fontWeight: 900, '&:hover': { bgcolor: '#006c51' } }}>Approve for sharing</Button></>}{campaign.status === 'approved' && <><Button variant="contained" onClick={() => setShareDialogOpen(true)} sx={{ minHeight: 66, flex: 1.25, bgcolor: 'var(--ls-primary)', textTransform: 'none', fontWeight: 900, '&:hover': { bgcolor: '#006c51' } }}>⌯&nbsp;&nbsp;Share to WhatsApp</Button><Button variant="outlined" onClick={copyCaption} sx={{ minHeight: 66, flex: 1, borderColor: 'var(--ls-border)', color: 'var(--ls-text-secondary)', textTransform: 'none', fontWeight: 900 }}>▣&nbsp;&nbsp;Copy approved post</Button></>}</Stack>
      </Stack></Paper> : <Alert severity="info">Create an opening post to start the promotion workspace.</Alert>}

      <Stack spacing={2.5}>{campaign ? <><Paper elevation={0} sx={{ overflow: 'hidden', border: '1px solid #dfe8f2', borderRadius: 2.1 }}><Box sx={{ px: 2.2, py: 1.35, bgcolor: 'var(--ls-purple-soft)', borderBottom: '1px solid #eadbff' }}><Typography sx={{ color: 'var(--ls-purple)', fontSize: 12, letterSpacing: .55, fontWeight: 900 }}>◌&nbsp;&nbsp;WHATSAPP STATUS PREVIEW</Typography></Box><Box sx={{ p: 2.4 }}><Typography sx={{ color: 'var(--ls-text)', fontSize: 15, fontWeight: 900 }}>{campaign.title}</Typography><Divider sx={{ my: 1.45, borderColor: 'var(--ls-border-subtle)' }} /><Typography sx={{ whiteSpace: 'pre-wrap', color: 'var(--ls-text-secondary)', fontSize: 13, lineHeight: 1.62 }}>{campaignText(campaign)}</Typography></Box></Paper><Paper elevation={0} sx={{ p: 2.2, border: '1px solid #dfe8f2', borderRadius: 2.1 }}><PanelHeading icon="◔">Campaign activity</PanelHeading><Stack spacing={1.2} sx={{ mt: 1.4, maxHeight: 330, overflowY: 'auto', pr: .6 }}>{campaign.activity?.length ? campaign.activity.map((event) => <Box key={event.id} sx={{ pb: 1.2, borderBottom: '1px solid #edf2f6' }}><Chip label={event.type.replaceAll('_', ' ')} size="small" sx={{ height: 20, bgcolor: 'var(--ls-surface-muted)', color: 'var(--ls-text-secondary)', fontSize: 9, fontWeight: 900, textTransform: 'uppercase' }} /><Typography sx={{ mt: .65, color: 'var(--ls-text-secondary)', fontSize: 12.5, fontWeight: 700, lineHeight: 1.45 }}>{event.detail}</Typography><Typography sx={{ mt: .35, color: 'var(--ls-text-muted)', fontSize: 10 }}>{formatDate(event.createdAt)}</Typography></Box>) : <Typography variant="body2" color="text.secondary">No activity yet.</Typography>}</Stack></Paper></> : <Paper elevation={0} sx={{ p: 2.2, border: '1px solid #dfe8f2', borderRadius: 2.1 }}><Typography sx={{ color: 'var(--ls-text-muted)', fontSize: 13 }}>Preview and activity appear after you create a post.</Typography></Paper>}</Stack>
    </Box>

    <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)} fullWidth maxWidth="xs"><DialogTitle sx={{ color: 'var(--ls-text)', fontWeight: 900 }}>Share approved opening post</DialogTitle><DialogContent><Stack spacing={2} sx={{ pb: 1 }}><Typography color="text.secondary">WhatsApp opens with your approved post. Choose <strong>My Status</strong> there to publish it yourself.</Typography><Button variant="contained" onClick={shareWhatsApp} sx={{ justifyContent: 'flex-start', minHeight: 54, bgcolor: '#25D366', textTransform: 'none', fontWeight: 900, '&:hover': { bgcolor: '#1fae55' } }}><Box component="span" sx={{ width: 29, height: 29, mr: 1.4, borderRadius: '50%', bgcolor: 'var(--ls-surface)', color: '#25D366', display: 'inline-grid', placeItems: 'center', fontWeight: 900 }}>W</Box>Open WhatsApp</Button><Typography variant="caption" color="text.secondary">Facebook sharing is intentionally deferred.</Typography><Button onClick={() => setShareDialogOpen(false)} sx={{ alignSelf: 'flex-end', textTransform: 'none', fontWeight: 800 }}>Cancel</Button></Stack></DialogContent></Dialog>
  </Stack>
}

export default MarketingPage