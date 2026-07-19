import { useEffect, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Divider, Paper, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getMarketingSettings, updateMarketingSettings } from '../../services/api'

const initialProfile = {
  brandTone: 'warm and friendly',
  language: 'English',
  stallTagline: '',
  location: '',
  operatingHours: '',
  openingTime: '',
  closingTime: '',
  googleMapsUrl: '',
  whatsappOrderUrl: '',
  deliveryUrl: '',
  reviewUrl: '',
}

const fieldSx = {
  width: '100%',
  minHeight: 62,
  px: 1.8,
  py: 1.25,
  borderRadius: 1.55,
  border: '1px solid #dce6f0',
  bgcolor: 'var(--ls-surface-muted)',
  color: 'var(--ls-text)',
  fontWeight: 800,
  outline: 'none',
  fontFamily: 'inherit',
  fontSize: 13,
  '&:focus': { borderColor: '#14a38a', boxShadow: '0 0 0 3px rgba(20,163,138,.1)' },
}

function ProfileField({ label, required, value, onChange, placeholder, accent = 'blue' }) {
  const borderColor = required && !value ? '#f5bf36' : 'var(--ls-border)'
  return <Box><Stack direction="row" justifyContent="space-between" sx={{ mb: .7 }}><Typography sx={{ color: '#8194b4', fontSize: 10, letterSpacing: .35, fontWeight: 900 }}>{label.toUpperCase()}{required ? ' *' : ''}</Typography>{required && <Typography sx={{ color: '#e58a00', fontSize: 9, fontWeight: 900 }}>REQUIRED</Typography>}</Stack><Box component="input" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} sx={{ ...fieldSx, borderColor, ...(accent === 'gold' && { borderColor: required && !value ? '#f5bf36' : '#f1c449' }) }} /></Box>
}

function TimeField({ label, required, value, onChange }) {
  const borderColor = required && !value ? '#f5bf36' : 'var(--ls-border)'
  return <Box><Stack direction="row" justifyContent="space-between" sx={{ mb: .7 }}><Typography sx={{ color: '#8194b4', fontSize: 10, letterSpacing: .35, fontWeight: 900 }}>{label.toUpperCase()}{required ? ' *' : ''}</Typography>{required && <Typography sx={{ color: '#e58a00', fontSize: 9, fontWeight: 900 }}>REQUIRED</Typography>}</Stack><Box component="input" type="time" value={value} onChange={(event) => onChange(event.target.value)} sx={{ ...fieldSx, borderColor, colorScheme: 'light dark', '&::-webkit-calendar-picker-indicator': { cursor: 'pointer' } }} /></Box>
}

function toTimeInput(value) {
  const match = String(value || '').match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
  if (!match) return ''
  let hour = Number(match[1])
  const minute = match[2]
  const period = match[3]?.toUpperCase()
  if (period === 'PM' && hour !== 12) hour += 12
  if (period === 'AM' && hour === 12) hour = 0
  return `${String(hour).padStart(2, '0')}:${minute}`
}

function parseOperatingHours(value) {
  const matches = String(value || '').match(/\d{1,2}:\d{2}\s*(?:AM|PM)?/gi) || []
  return { openingTime: toTimeInput(matches[0]), closingTime: toTimeInput(matches[1]) }
}

function formatTime(value) {
  if (!value) return ''
  const [hourText, minute] = value.split(':')
  const hour = Number(hourText)
  const period = hour >= 12 ? 'PM' : 'AM'
  return `${hour % 12 || 12}:${minute} ${period}`
}

function formatOperatingHours(openingTime, closingTime) {
  if (!openingTime || !closingTime) return ''
  return `Daily: ${formatTime(openingTime)} - ${formatTime(closingTime)}`
}
function ProfileSection({ number, icon, title, color, children }) {
  return <Card elevation={0} sx={{ border: '1px solid #dfe8f2', borderRadius: 2.2, boxShadow: '0 4px 14px rgba(26,58,91,.035)' }}><CardContent sx={{ p: { xs: 2.25, sm: 3 } }}><Stack spacing={2.3}><Stack direction="row" spacing={1.1} alignItems="center"><Box sx={{ color, fontSize: 20, lineHeight: 1 }}>{icon}</Box><Typography sx={{ color: 'var(--ls-text-muted)', fontSize: 13, letterSpacing: 1, fontWeight: 900 }}>{number}. {title.toUpperCase()}</Typography></Stack><Divider sx={{ borderColor: 'var(--ls-border-subtle)' }} />{children}</Stack></CardContent></Card>
}

function SettingsPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(initialProfile)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await getMarketingSettings()
        const data = response.data.data
        const savedSchedule = data.openingTime && data.closingTime ? { openingTime: data.openingTime, closingTime: data.closingTime } : parseOperatingHours(data.operatingHours)
        setProfile((current) => ({ ...current, ...data, ...savedSchedule }))
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Could not load your stall profile. Run the stall-opening marketing database migration first.')
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [])

  function updateField(field, value) {
    setProfile((current) => ({ ...current, [field]: value }))
  }

  async function saveProfile() {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const response = await updateMarketingSettings({
        brandTone: profile.brandTone,
        language: profile.language,
        stallTagline: profile.stallTagline,
        location: profile.location,
        operatingHours: formatOperatingHours(profile.openingTime, profile.closingTime),
        openingTime: profile.openingTime,
        closingTime: profile.closingTime,
        googleMapsUrl: profile.googleMapsUrl,
        whatsappOrderUrl: profile.whatsappOrderUrl,
        deliveryUrl: profile.deliveryUrl,
        reviewUrl: profile.reviewUrl,
      })
      const data = response.data.data
        const savedSchedule = data.openingTime && data.closingTime ? { openingTime: data.openingTime, closingTime: data.closingTime } : parseOperatingHours(data.operatingHours)
        setProfile((current) => ({ ...current, ...data, ...savedSchedule }))
      setNotice('Stall profile saved. Marketing and customer ordering now use these verified facts.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not save your stall profile.')
    } finally {
      setSaving(false)
    }
  }

  return <Stack spacing={3.25} sx={{ maxWidth: 980, mx: 'auto' }}>
    <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: 2.35, border: '1px solid #e0e9f2', background: 'linear-gradient(108deg, #fff 44%, #f5fffb)' }}><Typography variant="overline" sx={{ color: 'var(--ls-primary)', letterSpacing: 1.1, fontWeight: 900 }}>SETTINGS</Typography><Typography component="h1" sx={{ mt: .2, color: 'var(--ls-text)', fontSize: { xs: 30, sm: 38 }, fontWeight: 900 }}>Stall profile</Typography><Typography sx={{ mt: .8, maxWidth: 660, color: 'var(--ls-text-secondary)' }}>Set the stable facts about your stall once. Marketing uses them to write truthful opening posts.</Typography></Paper>
    {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
    {notice && <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert>}

    <ProfileSection number="1" icon="◎" title="Core identity & voice" color="#009b87"><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}><ProfileField label="Brand tone" value={profile.brandTone} onChange={(value) => updateField('brandTone', value)} placeholder="warm and friendly" /><ProfileField label="Language" value={profile.language} onChange={(value) => updateField('language', value)} placeholder="English" /></Stack><ProfileField label="Short stall tagline (optional)" value={profile.stallTagline} onChange={(value) => updateField('stallTagline', value)} placeholder="Best charcoal grilled burgers & authentic beverages" /></ProfileSection>

    <ProfileSection number="2" icon="⌖" title="Operations & presence" color="#f2a900"><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}><ProfileField label="Location" required value={profile.location} onChange={(value) => updateField('location', value)} placeholder="e.g. Block A, Lot 12, Ground Floor" accent="gold" /><Box sx={{ flex: 1 }}><Typography sx={{ mb: 1, color: 'var(--ls-text-muted)', fontSize: 12 }}>Daily operating hours</Typography><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}><TimeField label="Opens" required value={profile.openingTime} onChange={(value) => updateField('openingTime', value)} /><TimeField label="Closes" required value={profile.closingTime} onChange={(value) => updateField('closingTime', value)} /></Stack></Box></Stack></ProfileSection>

    <ProfileSection number="3" icon="⌘" title="Optional integrations & link binding" color="#00a8bf"><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}><ProfileField label="Google Maps link (optional)" value={profile.googleMapsUrl} onChange={(value) => updateField('googleMapsUrl', value)} placeholder="https://maps.app.goo.gl/..." /><ProfileField label="WhatsApp order link (optional)" value={profile.whatsappOrderUrl} onChange={(value) => updateField('whatsappOrderUrl', value)} placeholder="https://wa.me/..." /></Stack><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}><ProfileField label="Delivery link (optional)" value={profile.deliveryUrl} onChange={(value) => updateField('deliveryUrl', value)} placeholder="FoodPanda, GrabFood, etc." /><ProfileField label="Review link (optional)" value={profile.reviewUrl} onChange={(value) => updateField('reviewUrl', value)} placeholder="Google review link..." /></Stack></ProfileSection>

    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}><Button variant="contained" onClick={saveProfile} disabled={loading || saving} sx={{ minHeight: 50, px: 3.2, borderRadius: 1.6, bgcolor: 'var(--ls-primary)', textTransform: 'none', fontWeight: 900, '&:hover': { bgcolor: '#006c51' } }}>{saving ? 'Saving profile...' : 'Save stall profile'}</Button><Button variant="outlined" onClick={() => navigate('/vendor/marketing')} sx={{ minHeight: 50, borderRadius: 1.6, borderColor: '#d8c4f9', color: 'var(--ls-purple)', textTransform: 'none', fontWeight: 900 }}>Go to Marketing</Button></Stack>

    <Card elevation={0} sx={{ border: '1px solid #e1e9f1', borderRadius: 2.2 }}><CardContent><Stack spacing={1.4}><Typography sx={{ color: 'var(--ls-text)', fontWeight: 900 }}>Vendor session</Typography><Typography variant="body2" sx={{ color: 'var(--ls-text-secondary)' }}>Signed in as {user?.email}</Typography><Button variant="outlined" color="error" onClick={signOut} sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 800 }}>Sign out</Button></Stack></CardContent></Card>
  </Stack>
}

export default SettingsPage